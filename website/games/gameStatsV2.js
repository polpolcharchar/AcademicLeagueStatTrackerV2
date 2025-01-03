import { getGameMap, getPlayerMap, getTeamMap } from "../ApiAccess.js"
import { getTotalPointsForPlayer, getPlayerQuestionsCorrect, getPlayerQuestionsIncorrect, getPointsPerTossup, getPlayerQuestionsCorrectByCategory, getPlayerQuestionsIncorrectByCategory, getAllQuestions, getAnswerStateForPlayer } from "../gameStatUtil.js"
import { Categories } from "../scriptV2.js"
import { createQuestionDistributionChart, updateQuestionDistributionChartByIndex, createPlayerStatsChart, updatePlayerStatsChartByIndex, createGameTimelineChart, updateGameTimelineChart } from "../chartManager.js";

let gameMap;
let playerMap;
let teamMap;


//STARTUP
async function initializeMaps(){
    gameMap = await getGameMap();
    playerMap = await getPlayerMap();
    teamMap = await getTeamMap();
}

async function createGamesButtons(){
    //add import button

    let buttonDiv = document.getElementById("gamesButtonDiv");

    for (let gameID in gameMap){
        buttonDiv.appendChild(await createGameButton(gameID));
    }

    document.getElementById("gamesButtonDiv").style.display = "flex";
    document.body.style.cursor = 'auto';

}

async function intializeAll(){
    await initializeMaps();
    createGamesButtons();

    createQuestionDistributionChart('questionDistributionChart');
    createPlayerStatsChart('playerStatsChart');
    createGameTimelineChart('gameTimelineChart');

}

function createGameButton(gameID){
    let button = document.createElement("button");
    button.innerHTML = gameMap[gameID].name;
    button.id = gameID;
    button.onclick = function(){
        this.classList.toggle('selectedButton');

        if(this.classList.contains('selectedButton') && !event.ctrlKey){

            //turn off all buttons
            let currentButtons = document.getElementById("gamesButtonDiv");
            for(let i = 0; i < currentButtons.children.length; i++){
                currentButtons.children[i].classList.remove('selectedButton');
            }

            this.classList.add('selectedButton');
        }

        updateGameStatsDisplay();
    }

    return button;
}

//HELPER FUNCTIONS
function usernamesToDisplayNames(usernames){
    return usernames.map(username => playerMap[username].playerDisplayName);
}

function getUsernamesFromGameIDs(gameIDs) {
    const usernames = gameIDs.flatMap(gameID => gameMap[gameID].players1.concat(gameMap[gameID].players2));
    return [...new Set(usernames)];
}

function getCurrentGameIDs(){
    return Array.from(document.getElementById("gamesButtonDiv").getElementsByClassName('selectedButton')).map(button => button.id);
}


//UPDATE DISPLAY
function updateGameStatsDisplay(){
    let currentGameIDs = getCurrentGameIDs();


    if(currentGameIDs.length > 1){
        document.getElementById('gameName').textContent = "Multiple Games";
        document.getElementById('gameInfo').textContent = usernamesToDisplayNames(getUsernamesFromGameIDs(currentGameIDs)).join(", ");
        // document.getElementById('gameEvaluation').textContent = "";
    }else if(currentGameIDs.length === 1){
        document.getElementById('gameName').textContent = gameMap[currentGameIDs[0]].name;
        // document.getElementById('gameInfo').textContent = gameMap[currentGameIDs[0]].level.charAt(0).toUpperCase() + gameMap[currentGameIDs[0]].level.slice(1) + ": " + usernamesToDisplayNames(gameMap[currentGameIDs[0]].team1).join(", ") + " vs " + usernamesToDisplayNames(gameMap[currentGameIDs[0]].team2).join(", ");
        document.getElementById('gameInfo').textContent = usernamesToDisplayNames(gameMap[currentGameIDs[0]].players1).join(", ") + " vs " + usernamesToDisplayNames(gameMap[currentGameIDs[0]].players2).join(", ");
        // document.getElementById('gameEvaluation').textContent = gameMap[currentGameIDs[0]].evaluation;
    }else{
        document.getElementById('gameName').textContent = "No Games Selected";
        document.getElementById('gameInfo').textContent = "";
        // document.getElementById('gameEvaluation').textContent = "";
    }
    document.getElementById('infoDiv').style.display = 'block';

    //tables:
    fillPlayersTable(currentGameIDs);
    document.getElementById('playerDiv').style.display = 'block';

    fillQuestionsTable(currentGameIDs);
    document.getElementById('questionsDiv').style.display = 'block';

    //charts:
    updateQuestionDistributionChartByIndex(Chart.getChart('questionDistributionChart'), currentGameIDs.map(gameID => gameMap[gameID]));
    updatePlayerStatsChartByIndex(Chart.getChart('playerStatsChart'), currentGameIDs.map(gameID => gameMap[gameID]), playerStatsSorting, playerMap);

    if(currentGameIDs.length === 1){
        updateGameTimelineChart(Chart.getChart('gameTimelineChart'), gameMap[currentGameIDs[0]]);
        document.getElementById('timelineDiv').style.display = 'block';
    }else{
        document.getElementById('timelineDiv').style.display = 'none';
    }

    document.getElementById('chartDiv').style.display = 'flex';

}

const playerStatCalculators = {
    'Points': (gameIDs, playerUsername) => gameIDs.reduce((acc, gameID) => acc + getTotalPointsForPlayer(gameMap[gameID], playerUsername), 0),
    'Correct #': (gameIDs, playerUsername) => gameIDs.reduce((acc, gameID) => acc + getPlayerQuestionsCorrect(gameMap[gameID], playerUsername).length, 0),
    'Incorrect #': (gameIDs, playerUsername) => gameIDs.reduce((acc, gameID) => acc + getPlayerQuestionsIncorrect(gameMap[gameID], playerUsername).length, 0),
    'Points per Tossup': (gameIDs, playerUsername) => gameIDs.reduce((acc, gameID) => acc + getPointsPerTossup(gameMap[gameID], playerUsername), 0) / gameIDs.length,
    'Overall %': (gameIDs, playerUsername) => {

        let correct = playerStatCalculators['Correct #'](gameIDs, playerUsername);
        let incorrect = playerStatCalculators['Incorrect #'](gameIDs, playerUsername);

        if(correct + incorrect === 0){
            return 0;
        }

        return correct / (correct + incorrect);
    },
}
//add accuracy for each category
for(let i = 0; i < Categories.length; i++){
    let category = Categories[i];

    playerStatCalculators[category + ' %'] = (gameIDs, playerUsername) => {
        let numCorrect = gameIDs.reduce((acc, gameID) => acc + getPlayerQuestionsCorrectByCategory(gameMap[gameID], playerUsername, category).length, 0);
        let numIncorrect = gameIDs.reduce((acc, gameID) => acc + getPlayerQuestionsIncorrectByCategory(gameMap[gameID], playerUsername, category).length, 0);

        if(numCorrect + numIncorrect === 0){
            return 0;
        }

        return numCorrect / (numCorrect + numIncorrect);
    }

}


function fillPlayersTable(currentGameIDs){
    var tableHead = document.querySelector("#playersTable thead");
    tableHead.innerHTML = '';

    var headerRow = document.createElement("tr");
    var headerCell = document.createElement("td");
    headerCell.textContent = "Name";
    
    headerRow.appendChild(headerCell);
    
    for(let statName in playerStatCalculators){
        var headerCell = document.createElement("td");
        headerCell.textContent = statName;

        headerRow.appendChild(headerCell);
    }

    tableHead.appendChild(headerRow);
    
    var tableBody = document.querySelector("#playersTable tbody");
    tableBody.innerHTML = '';

    let players = getUsernamesFromGameIDs(currentGameIDs);

    for (let i = 0; i < players.length; i++) {

        //create a row with the player name and all their stats
        let row = document.createElement("tr");
        let playerUsername = players[i];

        //add player name
        let cell = document.createElement("td");
        cell.textContent = playerMap[playerUsername].playerDisplayName;
        cell.title = playerUsername;

        row.appendChild(cell);

        for(let statName in playerStatCalculators){
            let cell = document.createElement("td");
            let statValue = playerStatCalculators[statName](currentGameIDs, playerUsername);
            cell.textContent = Math.round(statValue * 100 * (statName.includes("%") ? 100 : 1)) / 100;
        
            //make the cell a bit darker on hover
            cell.addEventListener("mouseover", function(){
                this.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
            });
        
            cell.addEventListener("mouseout", function(){
                this.style.backgroundColor = ""; // Reset the background on mouse out
            });
        
            row.appendChild(cell);
        }

        // Append the row to the table body
        tableBody.appendChild(row);
    }

    document.getElementById("playersTable").addEventListener("click", function(e){
        let target = e.target;

        //if a header cell is clicked:
        if(target.tagName === "TD" && target.parentElement.parentElement.tagName === "THEAD"){

            //loop over all thead cells and remove the "selected" class
            document.querySelectorAll("#playersTable thead td").forEach(cell => cell.classList.remove("selected"));

            //add the "selected" class to the clicked cell
            target.classList.add("selected");

            let column = Array.from(target.parentElement.children).indexOf(target);

            let rows = document.querySelectorAll("#playersTable tbody tr");

            //sort the rows by the statName
            rows = Array.from(rows).sort((a, b) => {
                let aStat = a.children[column].textContent;
                let bStat = b.children[column].textContent;

                //if aStat is a number
                if(!isNaN(aStat)){
                    return bStat - aStat;
                }else{
                    return aStat.localeCompare(bStat);
                }
            });

            //remove all the rows from the table
            document.querySelectorAll("#playersTable tbody tr").forEach(row => row.remove());

            //add the rows back in the sorted order
            rows.forEach(row => document.querySelector("#playersTable tbody").appendChild(row));
        }
    });

    document.getElementById("playersTable").style.display = "table";
    document.body.style.cursor = "auto";
}

function fillQuestionsTable(currentGameIDs){
    let allQuestions = currentGameIDs.map(gameID => {
        let questions = getAllQuestions(gameMap[gameID]);
        questions.forEach(question => question.gameID = gameID);
        return questions;
    }).flat();

    let tbody = document.getElementById('questionsTable').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';

    let currentGame = '';

    for(let i = 0; i < allQuestions.length; i++){
        let question = allQuestions[i];

        let row = tbody.insertRow();

        let tossupNumberCell = row.insertCell(0);
        let categoryCell = row.insertCell(1);
        let player1Cell = row.insertCell(2);
        let player2Cell = row.insertCell(3);
        let answerStateCell = row.insertCell(4);
        
        if(currentGame !== gameMap[question.gameID].name){
            currentGame = gameMap[question.gameID].name;
            tossupNumberCell.textContent = currentGame;
        }else{
            tossupNumberCell.textContent = '';
        }

        categoryCell.textContent = question.category;

        player1Cell.textContent = question.initialPlayerUsername ? playerMap[question.initialPlayerUsername].playerDisplayName : '';
        player1Cell.setAttribute('title', question.initialPlayerUsername ? question.initialPlayerUsername : '');

        player2Cell.textContent = question.secondPlayerUsername ? playerMap[question.secondPlayerUsername].playerDisplayName : '';
        player2Cell.setAttribute('title', question.secondPlayerUsername ? question.secondPlayerUsername : '');

        answerStateCell.textContent = getAnswerStateForPlayer(question, question.initialPlayerUsername).replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }
}

//CHART UPDATES:
function onQuestionDistributionChartIndexChange(index){
    const buttons = document.getElementById('questionDistributionTypesDiv').children;
    for(let i = 0; i < buttons.length; i++){
        buttons[i].classList.remove('selectedButton');
        if(i === index){
            buttons[i].classList.add('selectedButton');
        }
    }

    updateQuestionDistributionChartByIndex(Chart.getChart('questionDistributionChart'), getCurrentGameIDs().map(gameID => gameMap[gameID]), index);
}
window.onQuestionDistributionChartIndexChange = onQuestionDistributionChartIndexChange;

function onPlayerStatsChartIndexChange(index){
    const buttons = document.getElementById('playerStatsTypesDiv').children;
    for(let i = 0; i < buttons.length; i++){
        buttons[i].classList.remove('selectedButton');
        if(i === index){
            buttons[i].classList.add('selectedButton');
        }
    }

    updatePlayerStatsChartByIndex(Chart.getChart('playerStatsChart'), getCurrentGameIDs().map(gameID => gameMap[gameID]), playerStatsSorting, playerMap, index);
}
window.onPlayerStatsChartIndexChange = onPlayerStatsChartIndexChange;

let playerStatsSorting = false;
function togglePlayerStatsSorting(){
    playerStatsSorting = !playerStatsSorting;
    document.getElementById('sortButton').classList.toggle('selectedButton');



    updatePlayerStatsChartByIndex(Chart.getChart('playerStatsChart'), getCurrentGameIDs().map(gameID => gameMap[gameID]), playerStatsSorting, playerMap);
}
window.togglePlayerStatsSorting = togglePlayerStatsSorting;




document.body.style.cursor = 'wait';
intializeAll();