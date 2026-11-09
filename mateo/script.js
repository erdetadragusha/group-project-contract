const signupForm=document.querySelector("#signup-form");

if(signupForm){
    signupForm.addEventListener("submit",function(event){
        event.preventDefault();

        const message=document.querySelector("#signup-message");

        message.textContent="Account creation is not connected yet. Your account has not been saved.";
    });
}

const loginForm=document.querySelector("#login-form");

if(loginForm){
    loginForm.addEventListener("submit",function(event){
        event.preventDefault();

        const message=document.querySelector("#login-message");

        message.textContent="Login is not connected yet. You have not been signed in.";
    });
}

const createTeamForm=document.querySelector("#create-team-form");

if(createTeamForm){
    createTeamForm.addEventListener("submit",function(event){
        event.preventDefault();

        const teamName=document.querySelector("#team-name");
        const message=document.querySelector("#team-message");

        if(teamName.value.trim()===""){
            message.textContent="Please enter a team name.";
            teamName.focus();
            return;
        }

        message.textContent="Team details are not connected yet. Your team has not been saved.";
    });
}