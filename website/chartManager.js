import { Categories } from "./scriptV2.js";
import { getAllQuestionsByCategory, getAllQuestionsByCategoryAndResponseType, getPlayerQuestionsCorrect, getPlayerQuestionsCorrectByCategory, getPlayerQuestionsBuzzed, getAnswerStateForPlayer, getPointsPerTossup, getAllQuestions, getQuestionPointsForPlayer } from "./gameStatUtil.js";

function generateColors(n, offset = 0) {
    const colors = [];
    for (let i = 0; i < n; i++) {
        const hue = i * (360 / n);
        const color = `hsl(${(hue + offset) % 360}, 100%, 30%)`;
        colors.push(color);
    }
    return colors;
}

export function createQuestionDistributionChart(chartID){

    let colors = generateColors(Categories.length, 0);

    let questionDistributionChartContext = document.getElementById(chartID).getContext('2d');
    let questionDistributionChart = new Chart(questionDistributionChartContext, {
        type: 'pie',
        data: {
            labels: Categories,
            datasets: [{
                label: 'Question Distribution',
                data: Categories.map(c => 0),
                backgroundColor: colors.map(color => color.replace('hsl', 'hsla').replace(')', ',0.5)')),
                borderColor: colors.map(color => color.replace('hsl', 'hsla').replace(')', ',1)')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
        }
    });
}

let lastQuestionDistributionTypeIndex = 0;
export function updateQuestionDistributionChartByIndex(questionDistributionChart, matchControllers, index = lastQuestionDistributionTypeIndex) {

    lastQuestionDistributionTypeIndex = index;

    let categoryCounts = Categories.map(() => 0);

    matchControllers.forEach(matchController => {
        if (index === 0) {
            Categories.forEach((category, i) => {
                categoryCounts[i] += getAllQuestionsByCategory(matchController, category).length;
            });
        } else if (index === 1) {
            Categories.forEach((category, i) => {
                categoryCounts[i] += getAllQuestionsByCategoryAndResponseType(matchController, category, 'CORRECT').length;
            });
        } else if (index === 2) {
            Categories.forEach((category, i) => {
                categoryCounts[i] += getAllQuestionsByCategoryAndResponseType(matchController, category, 'INCORRECT').length;
            });
        }
    });

    questionDistributionChart.data.datasets[0].data = categoryCounts;
    questionDistributionChart.update();
}
window.updateQuestionDistributionChartByIndex = updateQuestionDistributionChartByIndex;

export function createPlayerStatsChart(chartID) {

    let colors = generateColors(Categories.length);

    let playerStatsChartContext = document.getElementById(chartID).getContext('2d');

    //Create a dataset for each response type and PPT
    let dataSetArray = [
        {
            label: 'Correct',
            data: [],//new Array(numPlayers).fill(0),
            order: 1,
            backgroundColor: [
                'rgba(0, 200, 5, 0.5)'
            ],
            borderColor: [
                'rgba(0, 200, 5, 1)'
            ],
            borderWidth: 2
        }, 
        {
            label: 'Stolen Correct',
            data: [],//new Array(numPlayers).fill(0),
            order: 2,
            backgroundColor: [
                'rgba(50, 200, 50, 0.5)'
            ],
            borderColor: [
                'rgba(50, 200, 50, 1)'
            ],
            borderWidth: 2
        },
        {
            label: 'Incorrect',
            data: [],//new Array(numPlayers).fill(0),
            order: 3,
            backgroundColor: [
                'rgba(255, 150, 150, 0.5)'
            ],
            borderColor: [
                'rgba(255, 150, 150, 1)'
            ],
            borderWidth: 2
        },
        {
            label: 'Incorrect Thrown',
            data: [],//new Array(numPlayers).fill(0),
            order: 4,
            backgroundColor: [
                'rgba(255, 100, 100, 0.5)'
            ],
            borderColor: [
                'rgba(255, 100, 100, 1)'
            ],
            borderWidth: 2
        },
        {
            label: 'Incorrect Stolen',
            data: [],//new Array(numPlayers).fill(0),
            order: 5,
            backgroundColor: [
                'rgba(255, 50, 50, 0.5)'
            ],
            borderColor: [
                'rgba(255, 50, 50, 1)'
            ],
            borderWidth: 2
        },
        {
            label: 'Opponent Incorrect Thrown',
            data: [],//new Array(numPlayers).fill(0),
            order: 6,
            backgroundColor: [
                'rgba(255, 0, 0, 0.5)'
            ],
            borderColor: [
                'rgba(255, 0, 0, 1)'
            ],
            borderWidth: 2
        },
        {
            label: 'Points Per Tossup',
            data: [],//new Array(numPlayers).fill(0),
            order: 7,
            backgroundColor: [
                'rgba(252, 186, 3, 0.5)'
            ],
            borderColor: [
                'rgba(252, 186, 3, 1)'
            ],
            borderWidth: 2
        }
    ];

    //Add a dataset for each category
    let orderIndex = dataSetArray.length + 1;
    let initialLength = dataSetArray.length;
    Categories.forEach(key => {
        dataSetArray.push({
            label: key,
            data: [],//new Array(numPlayers).fill(0),
            order: orderIndex,
            
            backgroundColor: [
                colors[orderIndex - initialLength - 1].replace('hsl', 'hsla').replace(')', ',0.5)')
            ],
            borderColor: [
                colors[orderIndex - initialLength - 1].replace('hsl', 'hsla').replace(')', ',1)')
            ],

            borderWidth: 2
        });

        orderIndex++;
    });

    let playerStatsChart = new Chart(playerStatsChartContext, {
        type: 'bar',
        data: {
            datasets: dataSetArray,
            labels: [],//allPlayersDisplayNames
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        color: function(context) {
                            const playerName = context.tick.label;

                            // if(Object.values(matchControllers[0].getAllPlayers()).map(player => player.displayName).includes(playerName)){
                            //     return 'blue';
                            // }else{
                            //     return 'orange';
                            // }

                            return 'black';
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

let lastPlayerStatsTypeIndex = 1;
export function updatePlayerStatsChartByIndex(playerStatsChart, matchControllers, sort, playerMapIfNeeded, index = lastPlayerStatsTypeIndex){
    lastPlayerStatsTypeIndex = index;

    //reset all data:
    playerStatsChart.data.datasets.forEach(dataset => {
        dataset.data.fill(0);
    });

    //usernames are used for stats, display names are used for labels
    //if this is a saved game, the display names are not in match controller. they need to be accessed from playerMap
    let playerNamePairs = [];
    if(!playerMapIfNeeded){
        playerNamePairs = 
        Array.from(new Set(
            matchControllers.flatMap(matchController => Object.values(matchController.getAllPlayers()).map(player => [player.username, player.displayName]))
        ));
    }else{
        //create a set of playerUsernames:
        let playerUsernamesSeen = new Set();

        //loop over all players in all matchControllers' players1 and players2
        matchControllers.forEach(matchController => {
            let allPlayers = matchController.players1.concat(matchController.players2);

            allPlayers.forEach(player => {

                if(playerUsernamesSeen.has(player)){
                    return;
                }

                playerUsernamesSeen.add(player);
                playerNamePairs.push([player, playerMapIfNeeded[player].playerDisplayName]);
            });
        });
    }

    if(index === 0){

        if(sort){
            playerNamePairs = playerNamePairs.sort((a, b) => {
                let aCorrect = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsCorrect(matchController, a[0]).length, 0);
                let bCorrect = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsCorrect(matchController, b[0]).length, 0);

                return bCorrect - aCorrect;
            });
        }

        Categories.forEach(category => {
            playerStatsChart.data.datasets.find(dataset => dataset.label === category).data = playerNamePairs.map(pair => matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsCorrectByCategory(matchController, pair[0], category).length, 0));
        });

    }else if(index === 1){

        if(sort){
            //sort by # buzzes
            playerNamePairs = playerNamePairs.sort((a, b) => {
                let aBuzzes = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsBuzzed(matchController, a[0]).length, 0);
                let bBuzzes = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsBuzzed(matchController, b[0]).length, 0);

                if(aBuzzes === bBuzzes){
                    return matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsCorrect(matchController, b[0]).length, 0) - matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsCorrect(matchController, a[0]).length, 0);
                }

                return bBuzzes - aBuzzes;
            });
        }

        let usernames = playerNamePairs.map(pair => pair[0]);

        Object.values(usernames).forEach((username, index) => {
            playerStatsChart.data.datasets[0].data[index] = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsBuzzed(matchController, username).filter(question => getAnswerStateForPlayer(question, username) === 'CORRECT').length, 0);
            playerStatsChart.data.datasets[1].data[index] = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsBuzzed(matchController, username).filter(question => getAnswerStateForPlayer(question, username) === 'OPPONENT_INCORRECT_STOLEN').length, 0);
            playerStatsChart.data.datasets[2].data[index] = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsBuzzed(matchController, username).filter(question => getAnswerStateForPlayer(question, username) === 'INCORRECT').length, 0);
            playerStatsChart.data.datasets[3].data[index] = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsBuzzed(matchController, username).filter(question => getAnswerStateForPlayer(question, username) === 'INCORRECT_THROWN').length, 0);
            playerStatsChart.data.datasets[4].data[index] = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsBuzzed(matchController, username).filter(question => getAnswerStateForPlayer(question, username) === 'INCORRECT_STOLEN').length, 0);
            playerStatsChart.data.datasets[5].data[index] = matchControllers.reduce((sum, matchController) => sum + getPlayerQuestionsBuzzed(matchController, username).filter(question => getAnswerStateForPlayer(question, username) === 'OPPONENT_INCORRECT_THROWN').length, 0);
        });

    }else if(index === 2){

        if(sort){
            //sort by points per tossup
            playerNamePairs = playerNamePairs.sort((a, b) => {
                let aPoints = matchControllers.reduce((sum, matchController) => sum + getPointsPerTossup(matchController, a[0]), 0);
                let bPoints = matchControllers.reduce((sum, matchController) => sum + getPointsPerTossup(matchController, b[0]), 0);

                return bPoints - aPoints;
            });
        }

        playerStatsChart.data.datasets.find(dataset => dataset.label === 'Points Per Tossup').data = playerNamePairs.map(pair => matchControllers.reduce((sum, matchController) => sum + getPointsPerTossup(matchController, pair[0]), 0) / matchControllers.length);
    }

    //assign the labels to display names
    playerStatsChart.data.labels = playerNamePairs.map(pair => pair[1]);

    playerStatsChart.update();
}

export function createGameTimelineChart(chartID){

    let gameTimelineChartContext = document.getElementById(chartID).getContext('2d');
    let gameTimelineChart = new Chart(gameTimelineChartContext, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Team 1',
                    data: [{x: 0, y: 0}],
                    backgroundColor: 'rgba(100, 100, 252, 1)',
                    borderColor: 'rgba(100, 100, 252, 1)',
                    borderWidth: 5,
                    pointRadius: 0,
                    cubicInterpolationMode: 'monotone'
                },
                {
                    label: 'Team 2',
                    data: [{x: 0, y: 0}],
                    backgroundColor: 'rgba(252, 100, 100, 1)',
                    borderColor: 'rgba(252, 100, 100, 1)',
                    borderWidth: 5,
                    pointRadius: 0,
                    cubicInterpolationMode: 'monotone'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear',
                    stacked: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    beginAtZero: true,
                    stacked: false,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

export function updateGameTimelineChart(gameTimelineChart, matchController) {
    let data1 = [{ x: 0, y: 0 }];
    let data2 = [{ x: 0, y: 0 }];

    let score1 = 0;
    let score2 = 0;

    let tossupIndex = 1;

    // loop over all questions
    for (let question of getAllQuestions(matchController)) {

        let usernamesList1 = Array.isArray(matchController.players1) ? matchController.players1 : Object.keys(matchController.players1);
        for (let player of usernamesList1) {
            let s = getQuestionPointsForPlayer(question, player);
            if (s !== 0) {
                score1 += s;
                break;
            }
        }

        let usernamesList2 = Array.isArray(matchController.players2) ? matchController.players2 : Object.keys(matchController.players2);
        for (let player of usernamesList2) {
            let s = getQuestionPointsForPlayer(question, player);
            if (s !== 0) {
                score2 += s;
                break;
            }
        }

        data1.push({ x: tossupIndex, y: score1 });
        data2.push({ x: tossupIndex, y: score2 });

        tossupIndex++;
    }

    gameTimelineChart.data.datasets[0].data = data1;
    gameTimelineChart.data.datasets[1].data = data2;

    gameTimelineChart.update();
}
