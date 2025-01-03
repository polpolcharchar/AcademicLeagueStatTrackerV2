import { getGameMap, getTeamMap, getPlayerMap } from "./ApiAccess.js";

async function setupTeamOptions() {
    const teamMap = await getTeamMap();

    const team1Div = document.getElementById("team1");
    const team2Div = document.getElementById("team2");

    // Add each team as an option in the dropdown
    Object.keys(teamMap).forEach(teamID => {
        const option = document.createElement("option");
        option.value = teamID;
        option.text = teamMap[teamID].teamName;

        team1Div.querySelector(".teamDropdown").appendChild(option);
        team2Div.querySelector(".teamDropdown").appendChild(option.cloneNode(true));
    });

    function addTeamSelectChangeEventListener(teamDiv) {

        async function addPlayerInput(wrapperDiv, playerUsername) {
            // Create a wrapper div
            const wrapper = document.createElement('div');
            wrapper.classList.add('playerInputWrapper');
        
            // Create a text input
            const input = document.createElement('input');
            input.classList.add('playerInputField');
            input.type = 'text';
            input.value = (await getPlayerMap())[playerUsername].playerDisplayName;
            input.id = playerUsername;
            input.title = playerUsername;
            input.disabled = true;
        
            // Create a checkbox
            const checkBox = document.createElement('input');
            checkBox.type = 'checkbox';
            checkBox.checked = true;
            checkBox.classList.add('playerChoiceBox');
        
            // Append input and checkbox to the wrapper div
            wrapper.appendChild(checkBox);
            wrapper.appendChild(input);
        
            // Append the wrapper div to the nameInputs container
            wrapperDiv.appendChild(wrapper);
        }

        const dropdown = teamDiv.querySelector(".teamDropdown");
        const nameInputs = teamDiv.querySelector("[id^='nameInputs']");
        const customControls = teamDiv.querySelector("[id^='customTeamInputControls']");

        dropdown.addEventListener("change", async () => {
            nameInputs.innerHTML = "";

            if (dropdown.value === "other") {
                customControls.style.display = "block";
            } else {
                customControls.style.display = "none";

                teamMap[dropdown.value].teamPlayers.forEach(async playerUsername => {
                    addPlayerInput(nameInputs, playerUsername);
                });
            }
        });
    }

    addTeamSelectChangeEventListener(team1Div);
    addTeamSelectChangeEventListener(team2Div);

    team1Div.querySelector(".teamDropdown").disabled = false;
    team2Div.querySelector(".teamDropdown").disabled = false;

}

setupTeamOptions();