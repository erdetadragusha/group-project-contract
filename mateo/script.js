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
    const params=new URLSearchParams(window.location.search);
    const teamId=params.get("teamId");
    const validTeamId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId || "");

    const emails=[];
    let savedInvitations=[];
    let busy=true;
    let teamReady=false;

    const emailInput=document.querySelector("#member-email");
    const list=document.querySelector("#invite-list");
    const empty=document.querySelector("#invite-empty");
    const sendButton=document.querySelector("#send-invites");
    const addButton=inviteForm.querySelector('button[type="submit"]');
    const message=document.querySelector("#invite-message");

    const savedSection=document.createElement("section");
    const savedHeading=document.createElement("h2");
    const savedList=document.createElement("ul");

    savedHeading.textContent="Saved invitations";
    savedList.className="invite-list";
    savedSection.append(savedHeading,savedList);
    message.after(savedSection);

    sendButton.textContent="Save invitations";

    function renderInvites(){
        list.replaceChildren();
        savedList.replaceChildren();

        empty.hidden=emails.length>0;
        emailInput.disabled=busy || !teamReady;
        addButton.disabled=busy || !teamReady;
        sendButton.disabled=busy || !teamReady || emails.length===0;

        emails.forEach(function(email){
            const item=document.createElement("li");
            const text=document.createElement("span");
            const removeButton=document.createElement("button");

            text.textContent=email;
            removeButton.type="button";
            removeButton.textContent="Remove";
            removeButton.disabled=busy;
            removeButton.setAttribute("aria-label","Remove "+email);

            removeButton.addEventListener("click",function(){
                emails.splice(emails.indexOf(email),1);
                renderInvites();
                message.textContent=email+" removed from the draft list.";
                emailInput.focus();
            });

            item.append(text,removeButton);
            list.append(item);
        });

        savedInvitations.forEach(function(invitation){
            const item=document.createElement("li");
            const text=document.createElement("span");

            text.textContent=invitation.invited_email+" — "+invitation.status;

            item.append(text);
            savedList.append(item);
        });

        savedSection.hidden=savedInvitations.length===0;
    }

    async function loadInvitations(){
        renderInvites();

        if(!validTeamId){
            busy=false;
            message.textContent="Open this page after saving a team and project.";
            renderInvites();
            return;
        }

        message.textContent="Loading your team...";

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                message.textContent="Please log in before managing invitations.";
                return;
            }

            const {data:team,error:teamError}=await database
                .from("teams")
                .select("id,owner_id")
                .eq("id",teamId)
                .single();

            if(teamError || !team || team.owner_id!==userData.user.id){
                message.textContent="This team could not be loaded or you are not its owner.";
                return;
            }

            const {data,error}=await database
                .from("invitations")
                .select("id,invited_email,status")
                .eq("team_id",teamId)
                .order("created_at",{ascending:false});

            if(error){
                message.textContent=error.message;
                return;
            }

            savedInvitations=data;
            teamReady=true;
            message.textContent="Add email addresses to prepare invitations. Saving does not send emails yet.";
        }catch(error){
            message.textContent="Could not load invitations. Check your connection and reload the page.";
        }finally{
            busy=false;
            renderInvites();
        }
    }

    inviteForm.addEventListener("submit",function(event){
        event.preventDefault();

        if(busy || !teamReady){
            return;
        }

        const email=emailInput.value.trim().toLowerCase();

        const alreadyPending=savedInvitations.some(function(invitation){
            return invitation.invited_email===email && invitation.status==="pending";
        });

        if(emails.includes(email) || alreadyPending){
            message.textContent="This email is already in your draft list or has a pending invitation.";
            emailInput.focus();
            return;
        }

        emails.push(email);
        renderInvites();
        message.textContent=email+" added to the draft list.";
        emailInput.value="";
        emailInput.focus();
    });

    sendButton.addEventListener("click",async function(){
        if(busy || !teamReady || emails.length===0){
            return;
        }

        busy=true;
        renderInvites();
        message.textContent="Saving invitations...";

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                message.textContent="Please log in before saving invitations.";
                return;
            }

            const invitations=emails.map(function(email){
                return {
                    team_id:teamId,
                    invited_email:email,
                    created_by:userData.user.id
                };
            });

            const {data,error}=await database
                .from("invitations")
                .insert(invitations)
                .select("id,invited_email,status");

            if(error){
                message.textContent=error.code==="23505"
                    ? "An email already has a pending invitation. Reload to see the latest invitations; the draft list will reset."
                    : error.message;
                return;
            }

            savedInvitations=data.concat(savedInvitations);
            emails.length=0;
            message.textContent="Invitations saved as pending. No invitation emails have been sent yet.";
        }catch(error){
            message.textContent="Could not confirm saving. Reload to check saved invitations before trying again.";
        }finally{
            busy=false;
            renderInvites();
        }
    });

    loadInvitations();
}