const signupForm=document.querySelector("#signup-form");

if(signupForm){
    signupForm.addEventListener("submit",async function(event){
        event.preventDefault();

        const name=document.querySelector("#name");
        const email=document.querySelector("#email");
        const password=document.querySelector("#password");
        const message=document.querySelector("#signup-message");
        const button=signupForm.querySelector('button[type="submit"]');

        if(name.value.trim()===""){
            message.textContent="Please enter your name.";
            name.focus();
            return;
        }

        button.disabled=true;
        message.textContent="Creating your account...";

        try{
            const {data,error}=await database.auth.signUp({
                email:email.value.trim(),
                password:password.value,
                options:{
                    data:{
                        full_name:name.value.trim()
                    },
                    emailRedirectTo:new URL("login.html",window.location.href).href
                }
            });

            if(error){
                message.textContent=error.message;
                return;
            }

            password.value="";

            if(data.session){
                window.location.href="create-team.html";
            }else{
                message.textContent="Check your email for a confirmation link. If you already have an account, use Log in.";
            }
        }catch(error){
            message.textContent="Could not reach the signup service. Check your connection and try again.";
        }finally{
            button.disabled=false;
        }
    });
}

const loginForm=document.querySelector("#login-form");

if(loginForm){
    loginForm.addEventListener("submit",async function(event){
        event.preventDefault();

        const email=document.querySelector("#email");
        const password=document.querySelector("#password");
        const message=document.querySelector("#login-message");
        const button=loginForm.querySelector('button[type="submit"]');

        button.disabled=true;
        message.textContent="Logging in...";

        try{
            const {error}=await database.auth.signInWithPassword({
                email:email.value.trim(),
                password:password.value
            });

            if(error){
                message.textContent=error.message;
                return;
            }

            password.value="";
            window.location.href="create-team.html";
        }catch(error){
            message.textContent="Could not reach the login service. Check your connection and try again.";
        }finally{
            button.disabled=false;
        }
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
    const teamName=(params.get("teamName") || "").trim();
    const summary=document.querySelector("#team-summary");

    summary.textContent=teamName ? "Team: "+teamName : "Return to Create team and enter a team name.";

    projectDetailsForm.addEventListener("submit",async function(event){
        event.preventDefault();

        const projectName=document.querySelector("#project-name");
        const description=document.querySelector("#project-description");
        const message=document.querySelector("#project-message");
        const button=projectDetailsForm.querySelector('button[type="submit"]');

        if(teamName==="" || teamName.length>80){
            message.textContent="Return to Create team and enter a valid team name.";
            return;
        }

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

        button.disabled=true;
        message.textContent="Saving your team and project...";

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                message.textContent="Please log in before saving your team.";
                return;
            }

            const {data,error}=await database
                .from("teams")
                .insert({
                    owner_id:userData.user.id,
                    name:teamName,
                    project_name:projectName.value.trim(),
                    description:description.value.trim()
                })
                .select("id")
                .single();

            if(error){
                message.textContent=error.message;
                return;
            }

            message.textContent="Team and project saved.";

            window.location.href="invite-members.html?teamId="+encodeURIComponent(data.id);
        }catch(error){
            message.textContent="Could not save your team. Check your connection and try again.";
        }finally{
            button.disabled=false;
        }
    });
}

const inviteForm=document.querySelector("#invite-form");

if(inviteForm){
    const emails=[];
    const emailInput=document.querySelector("#member-email");
    const list=document.querySelector("#invite-list");
    const empty=document.querySelector("#invite-empty");
    const sendButton=document.querySelector("#send-invites");
    const message=document.querySelector("#invite-message");

    function renderInvites(){
        list.replaceChildren();
        empty.hidden=emails.length>0;
        sendButton.disabled=emails.length===0;

        emails.forEach(function(email){
            const item=document.createElement("li");
            const text=document.createElement("span");
            const removeButton=document.createElement("button");

            text.textContent=email;
            removeButton.type="button";
            removeButton.textContent="Remove";
            removeButton.setAttribute("aria-label","Remove "+email);

            removeButton.addEventListener("click",function(){
                emails.splice(emails.indexOf(email),1);
                renderInvites();
                message.textContent=email+" removed.";
                emailInput.focus();
            });

            item.append(text,removeButton);
            list.append(item);
        });
    }

    inviteForm.addEventListener("submit",function(event){
        event.preventDefault();

        const email=emailInput.value.trim().toLowerCase();

        if(emails.includes(email)){
            message.textContent="This email is already in the list.";
            emailInput.focus();
            return;
        }

        emails.push(email);
        renderInvites();
        message.textContent=email+" added to the list.";
        emailInput.value="";
        emailInput.focus();
    });

    sendButton.addEventListener("click",function(){
        message.textContent="Sending invitations is not connected yet. No invitations have been sent.";
    });
}