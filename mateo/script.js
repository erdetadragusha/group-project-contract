const pageParams=new URLSearchParams(window.location.search);
const invitationId=pageParams.get("invitationId");

const signupForm=document.querySelector("#signup-form");
const loginForm=document.querySelector("#login-form");
const createTeamForm=document.querySelector("#create-team-form");
const projectDetailsForm=document.querySelector("#project-details-form");

function validId(value){
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || "");
}

function afterLogin(){
    if(validId(invitationId)){
        return "join-team.html?invitationId="+encodeURIComponent(invitationId);
    }

    return "create-team.html";
}

function addLink(container,text,address){
    const link=document.createElement("a");

    link.textContent=text;
    link.href=address;
    link.className="button button-secondary";
    container.append(link);

    return link;
}

function showMessage(element,key){
    element.setAttribute("data-i18n",key);
    element.textContent=i18next.t(key);
}

function requestErrorKey(error){
    const keys={
        invalid_credentials:"auth.errors.invalidCredentials",
        email_not_confirmed:"auth.errors.emailUnconfirmed",
        user_already_exists:"auth.errors.alreadyRegistered",
        email_exists:"auth.errors.alreadyRegistered",
        email_address_invalid:"auth.errors.invalidEmail",
        over_email_send_rate_limit:"auth.errors.rateLimit",
        over_request_rate_limit:"auth.errors.rateLimit",
        signup_disabled:"auth.errors.signupDisabled"
    };

    return keys[error.code] || "auth.errors.generic";
}

function setupFormValidation(form){
    const inputs=form.querySelectorAll("input,textarea");

    inputs.forEach(function(input){
        input.addEventListener("input",function(){
            input.setCustomValidity("");
            input.removeAttribute("aria-invalid");
        });

        input.addEventListener("invalid",function(){
            input.setCustomValidity("");

            if(input.validity.valueMissing){
                input.setCustomValidity(
                    i18next.t("auth.errors.required")
                );
            }else if(input.type==="email" && input.validity.typeMismatch){
                input.setCustomValidity(
                    i18next.t("auth.errors.invalidEmail")
                );
            }else if(input.type==="password" && input.validity.tooShort){
                input.setCustomValidity(
                    i18next.t("auth.errors.shortPassword")
                );
            }

            input.setAttribute("aria-invalid","true");
        });
    });

    i18next.on("languageChanged",function(){
        inputs.forEach(function(input){
            input.setCustomValidity("");
        });
    });
}

let translatedFormsReady=false;

function setupTranslatedForms(){
    if(translatedFormsReady){
        return;
    }

    translatedFormsReady=true;

    if(signupForm){
        setupFormValidation(signupForm);

        const button=signupForm.querySelector('button[type="submit"]');
        button.disabled=false;

        if(validId(invitationId)){
            const loginLink=document.querySelector('a[href="login.html"]');

            if(loginLink){
                loginLink.href="login.html?invitationId="+encodeURIComponent(invitationId);
            }
        }

        signupForm.addEventListener("submit",async function(event){
            event.preventDefault();

            if(button.disabled){
                return;
            }

            const name=document.querySelector("#name");
            const email=document.querySelector("#email");
            const password=document.querySelector("#password");
            const message=document.querySelector("#signup-message");

            if(name.value.trim()===""){
                showMessage(message,"auth.errors.nameRequired");
                name.setAttribute("aria-invalid","true");
                name.focus();
                return;
            }

            button.disabled=true;
            showMessage(message,"auth.status.creating");

            try{
                const {data,error}=await database.auth.signUp({
                    email:email.value.trim(),
                    password:password.value,
                    options:{
                        data:{
                            full_name:name.value.trim(),
                            preferred_locale:i18next.resolvedLanguage
                        },
                        emailRedirectTo:new URL("login.html",window.location.href).href
                    }
                });

                if(error){
                    showMessage(message,requestErrorKey(error));
                    return;
                }

                password.value="";

                if(data.session){
                    window.location.href=afterLogin();
                }else{
                    showMessage(message,"auth.status.checkEmail");
                }
            }catch(error){
                showMessage(message,"auth.errors.signupConnection");
            }finally{
                button.disabled=false;
            }
        });
    }

    if(loginForm){
        setupFormValidation(loginForm);

        const button=loginForm.querySelector('button[type="submit"]');
        button.disabled=false;

        if(validId(invitationId)){
            const signupLink=document.querySelector('a[href="signup.html"]');

            if(signupLink){
                signupLink.href="signup.html?invitationId="+encodeURIComponent(invitationId);
            }
        }

        loginForm.addEventListener("submit",async function(event){
            event.preventDefault();

            if(button.disabled){
                return;
            }

            const email=document.querySelector("#email");
            const password=document.querySelector("#password");
            const message=document.querySelector("#login-message");

            button.disabled=true;
            showMessage(message,"auth.status.loggingIn");

            try{
                const {error}=await database.auth.signInWithPassword({
                    email:email.value.trim(),
                    password:password.value
                });

                if(error){
                    showMessage(message,requestErrorKey(error));
                    return;
                }

                password.value="";
                window.location.href=afterLogin();
            }catch(error){
                showMessage(message,"auth.errors.loginConnection");
            }finally{
                button.disabled=false;
            }
        });
    }

    if(createTeamForm){
        setupFormValidation(createTeamForm);

        const button=createTeamForm.querySelector('button[type="submit"]');
        button.disabled=false;

        createTeamForm.addEventListener("submit",function(event){
            event.preventDefault();

            const teamName=document.querySelector("#team-name");
            const message=document.querySelector("#team-message");

            if(teamName.value.trim()===""){
                showMessage(message,"team.nameRequired");
                teamName.setAttribute("aria-invalid","true");
                teamName.focus();
                return;
            }

            window.location.href="project-details.html?teamName="+encodeURIComponent(teamName.value.trim());
        });
    }

    if(projectDetailsForm){
        setupFormValidation(projectDetailsForm);

        const teamName=(pageParams.get("teamName") || "").trim();
        const summary=document.querySelector("#team-summary");
        const button=projectDetailsForm.querySelector('button[type="submit"]');

        button.disabled=false;

        function updateTeamSummary(){
            if(teamName!=="" && teamName.length<=80){
                summary.removeAttribute("data-i18n");

                summary.textContent=i18next.t("project.teamSummary",{
                    name:teamName
                });
            }else{
                showMessage(summary,"project.errors.missingTeam");
            }
        }

        updateTeamSummary();
        i18next.on("languageChanged",updateTeamSummary);

        projectDetailsForm.addEventListener("submit",async function(event){
            event.preventDefault();

            if(button.disabled){
                return;
            }

            const projectName=document.querySelector("#project-name");
            const description=document.querySelector("#project-description");
            const message=document.querySelector("#project-message");

            if(teamName==="" || teamName.length>80){
                showMessage(message,"project.errors.missingTeam");
                return;
            }

            if(projectName.value.trim()===""){
                showMessage(message,"project.errors.nameRequired");
                projectName.setAttribute("aria-invalid","true");
                projectName.focus();
                return;
            }

            if(description.value.trim()===""){
                showMessage(message,"project.errors.descriptionRequired");
                description.setAttribute("aria-invalid","true");
                description.focus();
                return;
            }

            button.disabled=true;
            showMessage(message,"project.saving");

            try{
                const {data:userData,error:userError}=await database.auth.getUser();

                if(userError || !userData.user){
                    showMessage(message,"project.errors.loginRequired");
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
                    showMessage(message,requestErrorKey(error));
                    return;
                }

                window.location.href="invite-members.html?teamId="+encodeURIComponent(data.id);
            }catch(error){
                showMessage(message,"project.errors.connection");
            }finally{
                button.disabled=false;
            }
        });
    }
}

const translatedForms=[
    signupForm,
    loginForm,
    createTeamForm,
    projectDetailsForm
];

if(translatedForms.some(function(form){
    return form!==null;
})){
    translatedForms.forEach(function(form){
        if(form){
            form.querySelector('button[type="submit"]').disabled=true;
        }
    });

    if(window.i18next){
        if(i18next.isInitialized){
            setupTranslatedForms();
        }else{
            i18next.on("initialized",setupTranslatedForms);
        }
    }
}

const inviteForm=document.querySelector("#invite-form");

if(inviteForm){
    const teamId=pageParams.get("teamId");
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
    const teamNav=document.createElement("nav");

    savedHeading.textContent="Saved invitations";
    savedList.className="invite-list";
    teamNav.className="welcome-actions";
    teamNav.setAttribute("aria-label","Team navigation");

    savedSection.append(savedHeading,savedList);
    message.after(savedSection);
    savedSection.after(teamNav);

    addLink(
        teamNav,
        "View team members",
        "team-members.html?teamId="+encodeURIComponent(teamId || "")
    );

    sendButton.textContent="Save invitations";

    function renderInvites(){
        list.replaceChildren();
        savedList.replaceChildren();

        empty.hidden=emails.length>0;
        emailInput.disabled=busy || !teamReady;
        addButton.disabled=busy || !teamReady;
        sendButton.disabled=busy || !teamReady || emails.length===0;
        teamNav.hidden=!teamReady;

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

            if(invitation.status==="pending"){
                const link=document.createElement("a");

                link.textContent="Open invitation";
                link.href="join-team.html?invitationId="+encodeURIComponent(invitation.id);
                item.append(link);
            }

            savedList.append(item);
        });

        savedSection.hidden=savedInvitations.length===0;
    }

    async function loadInvitations(){
        renderInvites();

        if(!validId(teamId)){
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
            message.textContent="Save invitations, then copy their links for your teammates. Emails are not sent automatically.";
        }catch(error){
            message.textContent="Could not load invitations. Check your connection and reload.";
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
            message.textContent="This email is already in the draft list or has a pending invitation.";
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
                    ? "An email already has a pending invitation. Reload to check; the draft list will reset."
                    : error.message;
                return;
            }

            savedInvitations=data.concat(savedInvitations);
            emails.length=0;
            message.textContent="Invitations saved. Copy the invitation links for your teammates. No emails have been sent.";
        }catch(error){
            message.textContent="Could not confirm saving. Reload to check saved invitations before trying again.";
        }finally{
            busy=false;
            renderInvites();
        }
    });

    loadInvitations();
}

const joinDetails=document.querySelector("#join-details");

if(joinDetails){
    const acceptButton=document.querySelector("#accept-invitation");
    const declineButton=document.querySelector("#decline-invitation");
    const message=document.querySelector("#join-message");
    const links=document.querySelector("#join-links");

    let currentInvitation=null;
    let responding=false;

    async function loadInvitation(){
        currentInvitation=null;
        acceptButton.disabled=true;
        declineButton.disabled=true;
        links.replaceChildren();

        if(!validId(invitationId)){
            joinDetails.textContent="No valid invitation link was provided.";
            return;
        }

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                joinDetails.textContent="Log in with the email address that received this invitation.";

                addLink(links,"Log in","login.html?invitationId="+encodeURIComponent(invitationId));
                addLink(links,"Create account","signup.html?invitationId="+encodeURIComponent(invitationId));
                return;
            }

            const {data,error}=await database
                .from("invitations")
                .select("id,team_id,invited_email,status")
                .eq("id",invitationId)
                .maybeSingle();

            if(error){
                joinDetails.textContent="Could not load invitation.";
                message.textContent=error.message;
                return;
            }

            if(!data){
                joinDetails.textContent="Invitation unavailable. Check that you logged in with the invited email address.";
                return;
            }

            if(data.invited_email!==(userData.user.email || "").toLowerCase()){
                joinDetails.textContent="This invitation belongs to another email address.";
                return;
            }

            currentInvitation=data;
            joinDetails.textContent="Invitation for "+data.invited_email+". Status: "+data.status+".";

            if(data.status==="pending"){
                acceptButton.disabled=false;
                declineButton.disabled=false;
                message.textContent="Accept to join the team, or decline the invitation.";
            }else if(data.status==="accepted"){
                message.textContent="You have accepted this invitation.";

                addLink(links,"View team members","team-members.html?teamId="+encodeURIComponent(data.team_id));
            }else{
                message.textContent="This invitation is no longer pending.";
            }
        }catch(error){
            joinDetails.textContent="Could not load invitation. Check your connection and reload.";
        }
    }

    async function respondToInvitation(accept){
        if(responding || !currentInvitation || currentInvitation.status!=="pending"){
            return;
        }

        responding=true;
        acceptButton.disabled=true;
        declineButton.disabled=true;
        message.textContent=accept ? "Joining team..." : "Declining invitation...";

        try{
            const {error}=await database.rpc("respond_to_invitation",{
                p_invitation_id:invitationId,
                p_accept:accept
            });

            if(error){
                message.textContent=error.message;
                acceptButton.disabled=false;
                declineButton.disabled=false;
                return;
            }

            await loadInvitation();
        }catch(error){
            message.textContent="Could not confirm your response. Reload to check the invitation status.";
        }finally{
            responding=false;
        }
    }

    acceptButton.addEventListener("click",function(){
        respondToInvitation(true);
    });

    declineButton.addEventListener("click",function(){
        respondToInvitation(false);
    });

    loadInvitation();
}

const membersSummary=document.querySelector("#members-summary");

if(membersSummary){
    const teamId=pageParams.get("teamId");
    const membersList=document.querySelector("#members-list");
    const invitationList=document.querySelector("#members-invitations");
    const empty=document.querySelector("#members-empty");
    const message=document.querySelector("#members-message");
    const inviteLink=document.querySelector("#members-invite-link");
    const refreshButton=document.querySelector("#refresh-members");

    async function loadMembers(){
        refreshButton.disabled=true;
        inviteLink.hidden=true;
        membersList.replaceChildren();
        invitationList.replaceChildren();
        membersSummary.textContent="Loading your team...";
        empty.textContent="Loading invitations...";
        empty.hidden=false;
        message.textContent="";

        if(!validId(teamId)){
            membersSummary.textContent="No valid team was selected.";
            empty.textContent="Open this page from your team invitation or Invite members page.";
            refreshButton.disabled=false;
            return;
        }

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                membersSummary.textContent="Please log in to view this team.";
                empty.textContent="Your session is unavailable.";
                return;
            }

            const {data:team,error:teamError}=await database
                .from("teams")
                .select("id,name,project_name,owner_id")
                .eq("id",teamId)
                .single();

            if(teamError || !team){
                membersSummary.textContent="Team unavailable or you do not have access.";
                empty.textContent="No invitation information loaded.";
                return;
            }

            const {data:members,error:membersError}=await database.rpc(
                "get_team_members",
                {p_team_id:teamId}
            );

            if(membersError){
                membersSummary.textContent="Could not load team members.";
                empty.textContent="No invitation information loaded.";
                message.textContent=membersError.message;
                return;
            }

            membersSummary.textContent=team.name+" — "+team.project_name;

            members.forEach(function(member){
                const item=document.createElement("li");
                const text=document.createElement("span");

                const role=member.is_owner ? "Owner" : "Member";

                text.textContent=member.full_name+" ("+member.email+") — "+role+" — Joined";

                item.append(text);
                membersList.append(item);
            });

            if(team.owner_id===userData.user.id){
                inviteLink.href="invite-members.html?teamId="+encodeURIComponent(teamId);
                inviteLink.hidden=false;
            }

            const {data:invitations,error:invitationsError}=await database
                .from("invitations")
                .select("id,invited_email,status")
                .eq("team_id",teamId)
                .order("created_at",{ascending:false});

            if(invitationsError){
                empty.textContent="Could not load invitations.";
                message.textContent=invitationsError.message;
                return;
            }

            empty.hidden=invitations.length>0;
            empty.textContent="No invitations created yet.";

            invitations.forEach(function(invitation){
                const item=document.createElement("li");
                const text=document.createElement("span");

                text.textContent=invitation.invited_email+" — "+invitation.status;

                item.append(text);
                invitationList.append(item);
            });

            message.textContent="Team information loaded.";
        }catch(error){
            message.textContent="Could not load all team information. Check your connection and press Refresh.";
            empty.textContent="Invitation information may be unavailable.";
        }finally{
            refreshButton.disabled=false;
        }
    }

    refreshButton.addEventListener("click",loadMembers);

    loadMembers();
}