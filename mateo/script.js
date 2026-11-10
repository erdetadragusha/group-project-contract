const pageParams=new URLSearchParams(window.location.search);
const invitationId=pageParams.get("invitationId");

const signupForm=document.querySelector("#signup-form");
const loginForm=document.querySelector("#login-form");
const createTeamForm=document.querySelector("#create-team-form");
const projectDetailsForm=document.querySelector("#project-details-form");
const inviteForm=document.querySelector("#invite-form");
const joinDetails=document.querySelector("#join-details");

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

function showMessage(element,key,options={}){
    element.setAttribute("data-i18n",key);
    element.setAttribute("data-i18n-options",JSON.stringify(options));
    element.textContent=i18next.t(key,options);
}

function clearMessage(element){
    element.removeAttribute("data-i18n");
    element.removeAttribute("data-i18n-options");
    element.textContent="";
}

function showAria(element,key,options={}){
    element.setAttribute("data-i18n-aria",key);
    element.setAttribute("data-i18n-options",JSON.stringify(options));
    element.setAttribute("aria-label",i18next.t(key,options));
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

function invitationStatusKey(status){
    const knownStatus=[
        "pending",
        "accepted",
        "declined",
        "revoked"
    ].includes(status);

    return knownStatus
        ? "invite.status."+status
        : "invite.status.unknown";
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
                summary.removeAttribute("data-i18n-options");

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

    if(inviteForm){
        setupFormValidation(inviteForm);
        setupInvitations();
    }

    if(joinDetails){
        setupJoinTeam();
    }
}

function setupInvitations(){
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

    showMessage(savedHeading,"invite.savedHeading");

    savedList.className="invite-list";
    teamNav.className="welcome-actions";

    showAria(teamNav,"invite.navigation");

    savedSection.append(savedHeading,savedList);
    message.after(savedSection);
    savedSection.after(teamNav);

    const membersLink=addLink(
        teamNav,
        "",
        "team-members.html?teamId="+encodeURIComponent(teamId || "")
    );

    showMessage(membersLink,"invite.membersLink");
    showMessage(sendButton,"invite.saveButton");

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
            removeButton.disabled=busy;

            showMessage(removeButton,"invite.removeButton");
            showAria(removeButton,"invite.removeLabel",{email:email});

            removeButton.addEventListener("click",function(){
                if(busy){
                    return;
                }

                const index=emails.indexOf(email);

                if(index!==-1){
                    emails.splice(index,1);
                }

                renderInvites();

                showMessage(message,"invite.messages.removed",{
                    email:email
                });

                emailInput.focus();
            });

            item.append(text,removeButton);
            list.append(item);
        });

        savedInvitations.forEach(function(invitation){
            const item=document.createElement("li");
            const text=document.createElement("span");

            showMessage(text,"invite.statusRow",{
                email:invitation.invited_email,
                status:i18next.t(invitationStatusKey(invitation.status))
            });

            item.append(text);

            if(invitation.status==="pending"){
                const link=document.createElement("a");

                link.href="join-team.html?invitationId="+encodeURIComponent(invitation.id);
                showMessage(link,"invite.openLink");
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
            showMessage(message,"invite.errors.missingTeam");
            renderInvites();
            return;
        }

        showMessage(message,"invite.messages.loading");

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                showMessage(message,"invite.errors.loginRequired");
                return;
            }

            const {data:team,error:teamError}=await database
                .from("teams")
                .select("id,owner_id")
                .eq("id",teamId)
                .single();

            if(teamError || !team || team.owner_id!==userData.user.id){
                showMessage(message,"invite.errors.notOwner");
                return;
            }

            const {data,error}=await database
                .from("invitations")
                .select("id,invited_email,status")
                .eq("team_id",teamId)
                .order("created_at",{ascending:false});

            if(error){
                showMessage(message,"invite.errors.load");
                return;
            }

            savedInvitations=data;
            teamReady=true;
            showMessage(message,"invite.messages.ready");
        }catch(error){
            showMessage(message,"invite.errors.load");
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
            return invitation.invited_email===email &&
                invitation.status==="pending";
        });

        if(emails.includes(email) || alreadyPending){
            showMessage(message,"invite.errors.duplicate");
            emailInput.setAttribute("aria-invalid","true");
            emailInput.focus();
            return;
        }

        emails.push(email);
        renderInvites();

        showMessage(message,"invite.messages.added",{
            email:email
        });

        emailInput.value="";
        emailInput.focus();
    });

    sendButton.addEventListener("click",async function(){
        if(busy || !teamReady || emails.length===0){
            return;
        }

        busy=true;
        renderInvites();
        showMessage(message,"invite.messages.saving");

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                showMessage(message,"invite.errors.loginRequired");
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
                const key=error.code==="23505"
                    ? "invite.errors.duplicatePending"
                    : "invite.errors.save";

                showMessage(message,key);
                return;
            }

            savedInvitations=data.concat(savedInvitations);
            emails.length=0;

            showMessage(message,"invite.messages.saved");
        }catch(error){
            showMessage(message,"invite.errors.save");
        }finally{
            busy=false;
            renderInvites();
        }
    });

    i18next.on("languageChanged",renderInvites);

    loadInvitations();
}

function setupJoinTeam(){
    const acceptButton=document.querySelector("#accept-invitation");
    const declineButton=document.querySelector("#decline-invitation");
    const message=document.querySelector("#join-message");
    const links=document.querySelector("#join-links");

    let currentInvitation=null;
    let responding=false;

    function updateInvitationSummary(){
        if(!currentInvitation){
            return;
        }

        showMessage(joinDetails,"join.summary",{
            email:currentInvitation.invited_email,
            status:i18next.t(
                invitationStatusKey(currentInvitation.status)
            )
        });
    }

    function addTranslatedLink(key,address){
        const link=addLink(links,"",address);
        showMessage(link,key);
    }

    async function loadInvitation(){
        currentInvitation=null;
        acceptButton.disabled=true;
        declineButton.disabled=true;
        links.replaceChildren();
        clearMessage(message);

        showMessage(joinDetails,"join.messages.loading");

        if(!validId(invitationId)){
            showMessage(joinDetails,"join.errors.missingInvitation");
            return;
        }

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                showMessage(joinDetails,"join.messages.loginRequired");

                addTranslatedLink(
                    "join.loginButton",
                    "login.html?invitationId="+encodeURIComponent(invitationId)
                );

                addTranslatedLink(
                    "join.signupButton",
                    "signup.html?invitationId="+encodeURIComponent(invitationId)
                );

                return;
            }

            const {data,error}=await database
                .from("invitations")
                .select("id,team_id,invited_email,status")
                .eq("id",invitationId)
                .maybeSingle();

            if(error){
                showMessage(joinDetails,"join.errors.load");
                return;
            }

            if(!data){
                showMessage(joinDetails,"join.errors.unavailable");
                return;
            }

            if(data.invited_email!==(userData.user.email || "").toLowerCase()){
                showMessage(joinDetails,"join.errors.wrongEmail");
                return;
            }

            currentInvitation=data;
            updateInvitationSummary();

            if(data.status==="pending"){
                acceptButton.disabled=false;
                declineButton.disabled=false;

                showMessage(message,"join.messages.ready");
            }else if(data.status==="accepted"){
                showMessage(message,"join.messages.accepted");

                addTranslatedLink(
                    "join.membersButton",
                    "team-members.html?teamId="+encodeURIComponent(data.team_id)
                );
            }else{
                showMessage(message,"join.messages.closed");
            }
        }catch(error){
            showMessage(joinDetails,"join.errors.load");
        }
    }

    async function respondToInvitation(accept){
        if(responding || !currentInvitation ||
            currentInvitation.status!=="pending"){
            return;
        }

        responding=true;
        acceptButton.disabled=true;
        declineButton.disabled=true;

        showMessage(
            message,
            accept ? "join.messages.accepting" : "join.messages.declining"
        );

        try{
            const {error}=await database.rpc("respond_to_invitation",{
                p_invitation_id:invitationId,
                p_accept:accept
            });

            if(error){
                const key=error.code==="email_not_confirmed"
                    ? "join.errors.confirmEmail"
                    : "join.errors.response";

                showMessage(message,key);
                return;
            }

            await loadInvitation();
        }catch(error){
            showMessage(message,"join.errors.response");
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

    i18next.on("languageChanged",updateInvitationSummary);

    loadInvitation();
}

const translatedForms=[
    signupForm,
    loginForm,
    createTeamForm,
    projectDetailsForm,
    inviteForm
];

const hasTranslatedForm=translatedForms.some(function(form){
    return form!==null;
});

if(hasTranslatedForm || joinDetails){
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