const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

function getItem(itemName){
    const params = {
        TableName: process.env.TableName,
        Key: {
            Name: itemName
        }
    };
    return dynamoDb.get(params).promise();
}

function getRandomKey(){
    return Math.random().toString(36).substring(2, 15);
}

exports.handler = async (event) => {

    if(event.type === 'ADD_TEAM'){

        if(!event.password || event.password !== process.env.PASSWORD){
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid password.' }),
            };
        }

        if(!event.teamName){
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid team name.' }),
            };
        }

        //add the team
        let teamMap = (await getItem('teams')).Item.teamMap;
        let newTeamKey = getRandomKey();
        teamMap[newTeamKey] = {
            teamName: event.teamName,
            teamPlayers: [],
            gameIDs: []
        };

        //update the team map
        const updateTeamsParams = {
            TableName: process.env.TableName,
            Key: {
                Name: 'teams'
            },
            UpdateExpression: 'set teamMap = :teamMap',
            ExpressionAttributeValues: {
                ':teamMap': teamMap
            }
        };
        await dynamoDb.update(updateTeamsParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'teamMap updated successfully.' }),
        };
    }else if(event.type === 'ADD_PLAYER_TO_TEAM'){
        
        if(!event.playerFirebaseUID || !event.teamUID || !event.password || event.password !== process.env.PASSWORD || !event.playerDisplayName || !event.playerUsername){
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid Input!' }),
            };
        }

        const teamMap = (await getItem('teams')).Item.teamMap;
        let playerMap = (await getItem('players')).Item.playerMap;

        if(!teamMap[event.teamUID]){
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid teamUID!' }),
            };
        }

        if(playerMap[event.playerUsername]){
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'That Username is Taken!' }),
            };
        }

        //add the player to the team
        teamMap[event.teamUID].teamPlayers.push(event.playerUsername);
        const updateTeamsParams = {
            TableName: process.env.TableName,
            Key: {
                Name: 'teams'
            },
            UpdateExpression: 'set teamMap = :teamMap',
            ExpressionAttributeValues: {
                ':teamMap': teamMap
            }
        };
        await dynamoDb.update(updateTeamsParams).promise();


        //add the player to the playerMap
        playerMap[event.playerUsername] = {
            playerDisplayName: event.playerDisplayName,
            teamUID: event.teamUID,
            gameIDs: {},
            playerFirebaseUID: event.playerFirebaseUID
        };
        const updatePlayersParams = {
            TableName: process.env.TableName,
            Key: {
                Name: 'players'
            },
            UpdateExpression: 'set playerMap = :playerMap',
            ExpressionAttributeValues: {
                ':playerMap': playerMap
            }
        };
        await dynamoDb.update(updatePlayersParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'playerMap updated successfully.' }),
        };
    }else if(event.type === 'ADD_GAME'){

        if(!event.password || event.password !== process.env.PASSWORD){
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid password.' }),
            };
        }

        let gameMap = (await getItem('games')).Item.gameMap;
        let playerMap = (await getItem('players')).Item.playerMap;
        let teamMap = (await getItem('teams')).Item.teamMap;

        //check that all players in the game exist in the playerMap
        let allGamePlayers = [...event.game.players1, ...event.game.players2];
        for(let i = 0; i < allGamePlayers.length; i++){
            if(!playerMap[allGamePlayers[i]]){
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Player ' + allGamePlayers[i] + ' does not exist.' }),
                };
            }
        }

        //check that event.game.team1UID and event.game.team2UID are valid
        if(!teamMap[event.game.team1UID] || !teamMap[event.game.team2UID]){
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid teamUID.' }),
            };
        }

        //Add the game:
        let newGameKey = getRandomKey();
        let newGame = event.game;
        newGame.public = false;

        gameMap[newGameKey] = newGame;

        const updateGamesParams = {
            TableName: process.env.TableName,
            Key: {
                Name: 'games'
            },
            UpdateExpression: 'set gameMap = :gameMap',
            ExpressionAttributeValues: {
                ':gameMap': gameMap
            }
        };
        await dynamoDb.update(updateGamesParams).promise();

        //Add the game to the team
        teamMap[event.game.team1UID].gameIDs.push(newGameKey);
        teamMap[event.game.team2UID].gameIDs.push(newGameKey);

        const updateTeamsParams = {
            TableName: process.env.TableName,
            Key: {
                Name: 'teams'
            },
            UpdateExpression: 'set teamMap = :teamMap',
            ExpressionAttributeValues: {
                ':teamMap': teamMap
            }
        };
        await dynamoDb.update(updateTeamsParams).promise();


        //Add the players
        for(let i = 0; i < allGamePlayers.length; i++){
            let player = allGamePlayers[i];
            let lineupIndexList = [];

            for(let j = 0; j < event.game.lineups.length; j++){
                
                if(event.game.lineups[j].players1.includes(player) || event.game.lineups[j].players2.includes(player)){
                    lineupIndexList.push(j);
                }
            }

            playerMap[player].gameIDs[newGameKey] = lineupIndexList;
        }
        const updatePlayerParams = {
            TableName: process.env.TableName,
            Key: {
                Name: 'players'
            },
            UpdateExpression: 'set playerMap = :playerMap',
            ExpressionAttributeValues: {
                ':playerMap': playerMap
            }
        };
        await dynamoDb.update(updatePlayerParams).promise();


        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'gameMap updated successfully.' }),
        };
    }else if(event.type === 'GET_DATA'){
        let gameMap = (await getItem('games')).Item.gameMap;

        //loop over the games in gameMap remove any games that are not public
        for(let key in gameMap){
            if(!gameMap[key].public){
                delete gameMap[key];
            }
        }

        let playerMap = (await getItem('players')).Item.playerMap;

        //remove firebaseUID
        for(let key in playerMap){
            delete playerMap[key].playerFirebaseUID;
        }

        let teamMap = (await getItem('teams')).Item.teamMap;

        return {
            statusCode: 200,
            body: JSON.stringify({ "gameMap": gameMap, "playerMap": playerMap, "teamMap": teamMap }),
        };
    }

};
