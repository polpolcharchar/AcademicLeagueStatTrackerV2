

export function getAllQuestions(matchController){
    return matchController.lineups.flatMap(lineup => lineup.questions);
}

export function getAllQuestionsByCategory(matchController, category){
    return getAllQuestions(matchController).filter(question => question.category === category);
}

export function getAllQuestionsByCategoryAndResponseType(matchController, category, responseType){
    return getAllQuestions(matchController).filter(question => question.category === category && question.responseType === responseType);
}

function didPlayerAnswerCorrectly(question, playerUsername){
    return (question.initialPlayerUsername === playerUsername && !question.secondPlayerUsername && question.responseType === 'CORRECT') || //Correct and no second
        (question.secondPlayerUsername === playerUsername && question.responseType === 'CORRECT');//Correct and second
}

function didPlayerAnswerIncorrectly(question, playerUsername){
    return (question.initialPlayerUsername === playerUsername && (question.secondPlayerUsername !== null || question.responseType === 'INCORRECT')) ||
        (question.secondPlayerUsername === playerUsername && question.responseType === 'INCORRECT');
}

function didPlayerBuzz(question, playerUsername){
    return question.initialPlayerUsername === playerUsername || question.secondPlayerUsername === playerUsername;
}

export function getPlayerQuestionsCorrect(matchController, playerUsername){
    return getAllQuestions(matchController).filter(question => didPlayerAnswerCorrectly(question, playerUsername));
}

export function getPlayerQuestionsIncorrect(matchController, playerUsername){
    return getAllQuestions(matchController).filter(question => didPlayerAnswerIncorrectly(question, playerUsername));
}

export function getPlayerQuestionsBuzzed(matchController, playerUsername){
    return getAllQuestions(matchController).filter(question => didPlayerBuzz(question, playerUsername));
}

export function getPlayerQuestionsCorrectByCategory(matchController, playerUsername, category){
    return getAllQuestions(matchController).filter(question => question.category === category && didPlayerAnswerCorrectly(question, playerUsername));
}

export function getPlayerQuestionsIncorrectByCategory(matchController, playerUsername, category){
    return getAllQuestions(matchController).filter(question => question.category === category && didPlayerAnswerIncorrectly(question, playerUsername));
}

export function getPlayerQuestionsBuzzedByCategory(matchController, playerUsername, category){
    return getAllQuestions(matchController).filter(question => question.category === category && didPlayerBuzz(question, playerUsername));
}

export function getAnswerStateForPlayer(question, playerUsername){
    if (question.initialPlayerUsername === null && question.secondPlayerUsername === null) {
        return 'SKIPPED';
    }

    if (question.initialPlayerUsername === playerUsername && question.secondPlayerUsername === null) {
        if (question.responseType === 'CORRECT') {
            return 'CORRECT';
        } else if (question.responseType === 'INCORRECT') {
            return 'INCORRECT';
        }
    } else if (question.initialPlayerUsername === playerUsername && question.secondPlayerUsername !== null) {
        if (question.responseType === 'CORRECT') {
            return 'INCORRECT_STOLEN';
        } else if (question.responseType === 'INCORRECT') {
            return 'INCORRECT_THROWN';
        } else {
            console.log("ERROR!!!!!!!!!!!");
        }
    } else if (question.secondPlayerUsername === playerUsername) {
        if (question.responseType === 'CORRECT') {
            return 'OPPONENT_INCORRECT_STOLEN';
        } else if (question.responseType === 'INCORRECT') {
            return 'OPPONENT_INCORRECT_THROWN';
        } else {
            console.log("ERROR!!!!!!!!!!!");
        }
    } else {
        return 'NO_ATTEMPT';
    }
}

function getQuestionsSeen(matchController, playerUsername){
    return matchController.lineups.filter(lineup => lineup.players1.includes(playerUsername) || lineup.players2.includes(playerUsername)).flatMap(lineup => lineup.questions);
}

export function getQuestionPointsForPlayer(question, playerUsername){

    if (question.initialPlayerUsername === playerUsername) {
        if (question.secondPlayerUsername === null) {
            return question.responseType === 'CORRECT' ? 3 : (question.responseType === 'INCORRECT' ? -1 : 0);
        } else {
            return -1;
        }
    } else if (question.secondPlayerUsername === playerUsername) {
        return question.responseType === 'CORRECT' ? 3 : 0;
    }

    return 0;
}

export function getTotalPointsForPlayer(matchController, playerUsername){
    return getQuestionsSeen(matchController, playerUsername).reduce((acc, question) => acc + getQuestionPointsForPlayer(question, playerUsername), 0);
}

export function getPointsPerTossup(matchController, playerUsername){

    let numQuestionsSeen = getQuestionsSeen(matchController, playerUsername).length;

    if(numQuestionsSeen === 0){
        return 0;
    }

    return getTotalPointsForPlayer(matchController, playerUsername) / numQuestionsSeen;
}