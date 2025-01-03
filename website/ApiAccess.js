let gameMap;
let teamMap;
let playerMap;

export async function getGameMap(){
    if(!gameMap){
        await loadData();
    }
    return gameMap;
}
export async function getTeamMap(){
    if(!teamMap){
        await loadData();
    }
    return teamMap;
}
export async function getPlayerMap(){
    if(!playerMap){
        await loadData();
    }
    return playerMap;
}

export async function loadData(){
    const ApiResult = await API_REQUEST({type: "GET_DATA"});
    const data = JSON.parse(ApiResult.body);

    gameMap = data.gameMap;
    teamMap = data.teamMap;
    playerMap = data.playerMap;
}

export async function saveGame(game){
    const request = {
        type: "ADD_GAME",
        password: prompt("Admin Password (for online saves only)"),
        game: game
    }

    const ApiResult = await API_REQUEST(request);
    console.log(ApiResult);
}

async function API_REQUEST(request){
    console.log("Requesting API");
    let url = "https://t3ofozhqz6.execute-api.us-west-2.amazonaws.com/default/AcademicLeagueStats";
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(request),
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    const result = await response.json();
    return result;
}