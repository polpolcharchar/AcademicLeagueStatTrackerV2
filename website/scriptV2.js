import { createQuestionDistributionChart, updateQuestionDistributionChartByIndex, createPlayerStatsChart, updatePlayerStatsChartByIndex, createGameTimelineChart, updateGameTimelineChart } from "./chartManager.js";
import { saveGame } from "./ApiAccess.js";

export const Categories = ['Art', 'Current Events', 'Geography', 'Grammar', 'History', 'Language', 'Literature', 'Math', 'Mythology', 'Science'];

const GameState = {
    INITIAL: 'INITIAL',
    STEAL: 'STEAL'
};

const ResponseType = {
    CORRECT: 'CORRECT',
    INCORRECT: 'INCORRECT',
    SKIPPED: 'SKIPPED'
}

class Question{
    constructor(category, responseType, initialPlayerUsername = null, secondPlayerUsername = null){
        this.category = category;
        this.responseType = responseType;
        this.initialPlayerUsername = initialPlayerUsername;
        this.secondPlayerUsername = secondPlayerUsername;
        this.id = Question.getID();
    }

    static getID(){
        if(!this.id)this.id = 0;

        return this.id++;
    }
}

class MatchController{

    constructor(usernames1, displayNames1, playingUsernames1, usernames2, displayNames2, playingUsernames2, initialTime, team1UID, team2UID){

        this.players1 = {};
        this.players2 = {};

        this.team1UID = team1UID;
        this.team2UID = team2UID;

        function fillPlayers(players, usernames, displayNames, playingUsernames){
            for(let i = 0; i < usernames.length; i++){
                players[usernames[i]] = {
                    displayName: displayNames[i],
                    username: usernames[i],
                    isPlaying: playingUsernames.includes(usernames[i])
                }
            }
        }

        fillPlayers(this.players1, usernames1, displayNames1, playingUsernames1);
        fillPlayers(this.players2, usernames2, displayNames2, playingUsernames2);

        this.lastTime = initialTime;

        this.lineups = [{
            time: initialTime,
            players1: playingUsernames1,
            players2: playingUsernames2,
            questions: []
        }]

        this.initialPlayerUsername = null;
        this.secondPlayerUsername = null;

        this.currentCategory = null;
        this.gameState = GameState.INITIAL;
    }

    getAllPlayers(){
        return {...this.players1, ...this.players2};
    }

    performSubstitution(playingUsernames1, playingUsernames2, newTime){

        // Update the last time
        this.lastTime = newTime;


        // Update isPlaying
        function updatePlaying(players, playingUsernames){
            Object.values(players).forEach(player => {
                player.isPlaying = playingUsernames.includes(player.username);
            });
        }

        updatePlaying(this.players1, playingUsernames1);
        updatePlaying(this.players2, playingUsernames2);

        // Update the lineups
        this.lineups.push({
            time: newTime,
            players1: playingUsernames1,
            players2: playingUsernames2,
            questions: []
        });

    }

    submitCategory(category){
        this.currentCategory = category;
        this.gameState = GameState.INITIAL;//Can this be removed?
    }

    submitPlayer(playerUsername){
        if(this.gameState === GameState.INITIAL){
            this.initialPlayerUsername = playerUsername;
        }else if(this.gameState === GameState.STEAL){
            this.secondPlayerUsername = playerUsername;
        }
    }

    submitAnswer(responseType){
        
        if(this.gameState === GameState.INITIAL && responseType === ResponseType.INCORRECT){
            this.gameState = GameState.STEAL;
            return;
        }

        if(this.gameState === GameState.STEAL && responseType === ResponseType.SKIPPED){
            this.lineups[this.lineups.length - 1].questions.push(new Question(this.currentCategory, ResponseType.INCORRECT, this.initialPlayerUsername, this.secondPlayerUsername));
        }else{
            this.lineups[this.lineups.length - 1].questions.push(new Question(this.currentCategory, responseType, this.initialPlayerUsername, this.secondPlayerUsername));
        }

        this.initialPlayerUsername = null;
        this.secondPlayerUsername = null;
        this.currentCategory = null;
        this.gameState = GameState.INITIAL;

    }

    isTimeValid(t){
        return t <= this.lastTime && t >= 0;
    }

    isPlayerPlaying(playerUsername){
        return this.getAllPlayers()[playerUsername].isPlaying;
    }

    arePlayersOnSameTeam(player1Username, player2Username){
        return this.players1[player1Username] && this.players1[player2Username] || this.players2[player1Username] && this.players2[player2Username];
    }

    removeQuestionByID(questionID){
        //the question could be in any lineup, so we need to loop over all of them
        for(let i = 0; i < this.lineups.length; i++){
            for(let j = 0; j < this.lineups[i].questions.length; j++){
                if(this.lineups[i].questions[j].id === questionID){
                    this.lineups[i].questions.splice(j, 1);
                    return;
                }
            }
        }
    }

}

let matchController;

//EVENTS:
function onTeamEditComplete(){

    const currentTime = parseInt(document.getElementById('currentTime').value, 10);

    function getPlayersInputsFormatted(teamDiv) {
        const nameInputs = teamDiv.querySelector("[id^='nameInputs']");

        const usernames = [];
        const displayNames = [];
        const playingUsernames = [];
        //loop over each child of nameInputs, then get the input field, and add its value to the players array
        for (let i = 0; i < nameInputs.children.length; i++) {
            const playerInput = nameInputs.children[i].querySelector('.playerInputField');
            const checkBox = nameInputs.children[i].querySelector('.playerChoiceBox');

            if(!playerInput.value){
                playerInput.value = playerInput.placeholder;
            }
            if(!playerInput.id){
                playerInput.id = playerInput.value;
            }

            usernames.push(playerInput.id);
            displayNames.push(playerInput.value);
            if(checkBox.checked){
                playingUsernames.push(playerInput.id);
            }
        }

        return {usernames, displayNames, playingUsernames};
    }

    const players1 = getPlayersInputsFormatted(document.getElementById("team1"));
    const players2 = getPlayersInputsFormatted(document.getElementById("team2"));

    if(!matchController){

        document.getElementById('team1NameSelect').disabled = true;
        document.getElementById('team2NameSelect').disabled = true;

        matchController = new MatchController(players1.usernames, players1.displayNames, players1.playingUsernames, players2.usernames, players2.displayNames, players2.playingUsernames, currentTime, document.getElementById('team1NameSelect').value, document.getElementById('team2NameSelect').value);
        window.matchController = matchController;

        //hide all divs that have an id beginning with customTeamInputControls
        document.querySelectorAll("[id^='customTeamInputControls']").forEach(div => {
            div.style.display = "none";
        });

        window.addEventListener('beforeunload', function (event) {
            event.preventDefault();
            event.returnValue = '';

            // For some older browsers:
            return 'Are you sure you want to leave? Your changes may not be saved.';
        });

        document.getElementById('currentTimeLabel').textContent = 'Current Time: ';

        //create player buttons
        createPlayerInputs(players1.displayNames, players1.usernames);
        createPlayerInputs(players2.displayNames, players2.usernames);

        //create category buttons
        createCategoryInputs();

        //create charts
        createQuestionDistributionChart('questionDistributionChart');
        createPlayerStatsChart('playerStatsChart');
        createGameTimelineChart('gameTimelineChart');


        document.getElementById('chartDiv').style.display = 'flex';
        document.getElementById('questionsDiv').style.display = 'block';
        
    }else if(!matchController.isTimeValid(currentTime)){
        alert('Invalid time');
        return;
    }else{
        matchController.performSubstitution(players1.playingUsernames, players2.playingUsernames, currentTime);
    }

    //hide setup and show game
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game').style.display = 'block';


}
window.onTeamEditComplete = onTeamEditComplete;

function onTeamEditBegin(){
    document.getElementById('setup').style.display = 'block';
    document.getElementById('game').style.display = 'none';
}
window.onTeamEditBegin = onTeamEditBegin;

function submitAnswer(responseType){
    matchController.submitAnswer(responseType);

    updateDisplay();

    //update questions table:
    if(matchController.gameState === GameState.INITIAL){

        let lineupIndex = matchController.lineups.length - 1;
        let questionIndex = matchController.lineups[lineupIndex].questions.length - 1;
        let questionID = matchController.lineups[lineupIndex].questions[questionIndex].id;

        const lastQuestion = matchController.lineups[lineupIndex].questions[questionIndex];
        const table = document.getElementById('questionsTable').getElementsByTagName('tbody')[0];

        const row = table.insertRow();
        row.insertCell(0).textContent = lastQuestion.category;
        row.insertCell(1).textContent = matchController.getAllPlayers()[lastQuestion.initialPlayerUsername]?.displayName || '';
        row.insertCell(2).textContent = matchController.getAllPlayers()[lastQuestion.secondPlayerUsername]?.displayName || '';
        row.insertCell(3).textContent = lastQuestion.responseType;

        row.onclick = () => {
            document.getElementById('questionsTable').deleteRow(row.rowIndex);

            matchController.removeQuestionByID(questionID);

            //update charts
            updateQuestionDistributionChartByIndex(Chart.getChart('questionDistributionChart'), [matchController]);
            updatePlayerStatsChartByIndex(Chart.getChart('playerStatsChart'), [matchController], playerStatsSorting);
            updateGameTimelineChart(Chart.getChart('gameTimelineChart'), matchController);
        }
        row.style.cursor = 'not-allowed';
        
        //this method is definitly not the best way to do this, but it works for now
        const originalBackgroundColor = row.style.backgroundColor;
        row.onmouseover = () => {
            //make it red
            row.style.backgroundColor = '#ff8f9e';
        }

        row.onmouseout = () => {
            //reset to original background color
            row.style.backgroundColor = originalBackgroundColor;
        }
    }

    //update charts
    updateQuestionDistributionChartByIndex(Chart.getChart('questionDistributionChart'), [matchController]);
    updatePlayerStatsChartByIndex(Chart.getChart('playerStatsChart'), [matchController], playerStatsSorting);
    updateGameTimelineChart(Chart.getChart('gameTimelineChart'), matchController);

    
}
window.submitAnswer = submitAnswer;

function beginGameSave(){
    document.getElementById('saveButton').disabled = true;
    document.getElementById('saveDataButton').disabled = true;

    const game = {
        players1: Object.keys(matchController.players1),
        players2: Object.keys(matchController.players2),
        lineups: matchController.lineups,
        level: document.getElementById('levelDropdown').value,
        name: document.getElementById('saveDataName').value,
        date: new Date().toLocaleDateString('en-US'),
        team1UID: matchController.team1UID,
        team2UID: matchController.team2UID,
    };

    //save to file
    const json = JSON.stringify(game);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = document.getElementById('saveDataName').value + '.json';
    a.click();

    URL.revokeObjectURL(url);

    //save to database
    saveGame(game);
}
window.beginGameSave = beginGameSave;

//CHART EVENTS:
function onQuestionDistributionChartIndexChange(index){
    const buttons = document.getElementById('questionDistributionTypesDiv').children;
    for(let i = 0; i < buttons.length; i++){
        buttons[i].classList.remove('selectedButton');
        if(i === index){
            buttons[i].classList.add('selectedButton');
        }
    }

    updateQuestionDistributionChartByIndex(Chart.getChart('questionDistributionChart'), [matchController], index);
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

    updatePlayerStatsChartByIndex(Chart.getChart('playerStatsChart'), [matchController], playerStatsSorting, null, index);
}
window.onPlayerStatsChartIndexChange = onPlayerStatsChartIndexChange;

let playerStatsSorting = false;
function togglePlayerStatsSorting(){
    playerStatsSorting = !playerStatsSorting;
    document.getElementById('sortButton').classList.toggle('selectedButton');



    updatePlayerStatsChartByIndex(Chart.getChart('playerStatsChart'), [matchController], playerStatsSorting);
}
window.togglePlayerStatsSorting = togglePlayerStatsSorting;


//UI CREATION:
function createCategoryInputs(){
    Categories.forEach(category => {
        const button = document.createElement('button');
        button.id = category;
        button.textContent = category;
        button.onclick = () => {
            matchController.submitCategory(category);

            updateDisplay();
        };
        document.getElementById('categoryButtons').appendChild(button);
    });
}

function createPlayerInputs(playerDisplayNames, playerUsernames){
    playerDisplayNames.forEach((playerDisplayName, i) => {
        const button = document.createElement('button');
        button.id = playerUsernames[i];
        button.textContent = playerDisplayName;
        button.onclick = () => {
            matchController.submitPlayer(playerUsernames[i]);

            updateDisplay();
        };
        button.classList.add('playerButton');

        //Add border here

        document.getElementById('playerButtons').appendChild(button);
    });
}

function addPlayerNameInput(elementID){
    // Create a wrapper div
    const wrapper = document.createElement('div');
    wrapper.classList.add('playerInputWrapper');

    // Create a text input
    const input = document.createElement('input');
    input.classList.add('playerInputField');
    input.type = 'text';
    input.placeholder = `Player ${Math.floor(1000 + Math.random() * 9000)}`;

    // Create a checkbox
    const checkBox = document.createElement('input');
    checkBox.type = 'checkbox';
    checkBox.checked = true;
    checkBox.classList.add('playerChoiceBox');

    // Append input and checkbox to the wrapper div
    wrapper.appendChild(checkBox);
    wrapper.appendChild(input);

    // Append the wrapper div to the nameInputs container
    document.getElementById(elementID).appendChild(wrapper);
}
window.addPlayerNameInput = addPlayerNameInput;

function removePlayerNameInput(elementID){
    const nameInputs = document.getElementById(elementID);

    if(nameInputs.children.length === 0){
        return;
    }

    nameInputs.removeChild(nameInputs.lastChild);
}
window.removePlayerNameInput = removePlayerNameInput;



//UI UPDATES:
function updateDisplay(){

    //update category buttons
    const categoryButtons = document.getElementById('categoryButtons').children;

    for(let i = 0; i < categoryButtons.length; i++){
        categoryButtons[i].classList.remove('selectedButton');
        categoryButtons[i].disabled = matchController.currentCategory !== null;

        if(categoryButtons[i].id === matchController.currentCategory){
            categoryButtons[i].classList.add('selectedButton');
        }
    }

    //update player buttons
    if(matchController.currentCategory){

        document.getElementById('playerChoices').style.display = 'block';

        //this does NOT include the skip button, which is a player choice, but not a player
        const playerButtons = Array.from(document.getElementById('playerButtons').children);

        playerButtons.forEach(button => {
            button.style.display = matchController.isPlayerPlaying(button.id) ? 'block' : 'none';
        });

        if(matchController.gameState === GameState.INITIAL){

            playerButtons.forEach(button => {
                //if a player has already been selected, disable all buttons
                button.disabled = matchController.initialPlayerUsername ? true : false;
                button.classList.remove('selectedButton');
                if(button.id === matchController.initialPlayerUsername){
                    button.classList.add('selectedButton');
                }
            });

        }else{

            if(matchController.secondPlayerUsername){
                //a second player has been selected, disable all buttons, select the second player button
                playerButtons.forEach(button => {
                    button.disabled = true;
                    button.classList.remove('selectedButton');
                    if(button.id === matchController.secondPlayerUsername){
                        button.classList.add('selectedButton');
                    }
                });
            }else{
                //a second player has not yet been selected, enable all players that are not on the same teasm as the initial player
                playerButtons.forEach(button => {
                    button.disabled = matchController.arePlayersOnSameTeam(matchController.initialPlayerUsername, button.id);
                    button.classList.remove('selectedButton');
                });
            }
        }

        //handle the skip button:
        document.getElementById('skipButtonDiv').style.display = matchController.gameState === GameState.INITIAL && matchController.initialPlayerUsername || matchController.gameState === GameState.STEAL && matchController.secondPlayerUsername ? 'none' : 'flex';


    }else{
        document.getElementById('playerChoices').style.display = 'none';
    }

    //update answer buttons:
    if(matchController.gameState === GameState.INITIAL && matchController.initialPlayerUsername || matchController.gameState === GameState.STEAL && matchController.secondPlayerUsername){
        document.getElementById('answerButtons').style.display = 'flex';
    }else{
        document.getElementById('answerButtons').style.display = 'none';
    }

    //update action buttons:
    if(matchController.currentCategory){
        document.getElementById('actionButtons').style.display = 'none';
    }else{
        document.getElementById('actionButtons').style.display = 'flex';
    }
}