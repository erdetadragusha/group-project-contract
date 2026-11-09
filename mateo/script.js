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

        window.location.href="project-details.html?teamName="+encodeURIComponent(teamName.value.trim());
    });
}

const projectDetailsForm=document.querySelector("#project-details-form");

if(projectDetailsForm){
    const params=new URLSearchParams(window.location.search);
    const teamName=params.get("teamName");
    const summary=document.querySelector("#team-summary");

    summary.textContent=teamName ? "Team: "+teamName : "Add your project information.";

    projectDetailsForm.addEventListener("submit",function(event){
        event.preventDefault();

        const projectName=document.querySelector("#project-name");
        const description=document.querySelector("#project-description");
        const message=document.querySelector("#project-message");

        if(projectName.value.trim()===""){
            message.textContent="Please enter a project name.";
            projectName.focus();
            return;
        }

        if(description.value.trim()===""){
            message.textContent="Please enter a project description.";
            description.focus();
            return;
        }

        message.textContent="Project details are not connected yet. Your team and project have not been saved.";
    });
}