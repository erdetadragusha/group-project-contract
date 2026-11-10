(function(){
    const params=new URLSearchParams(window.location.search);
    const teamId=params.get("teamId");

    const summary=document.querySelector("#status-team");
    const list=document.querySelector("#status-list");
    const empty=document.querySelector("#status-empty");
    const message=document.querySelector("#status-message");
    const refreshButton=document.querySelector("#status-refresh");
    const membersLink=document.querySelector("#status-members-link");
    const inviteLink=document.querySelector("#status-invite-link");

    let team=null;
    let invitations=[];
    let owner=false;
    let busy=false;
    let loaded=false;
    let started=false;
    let messageKey="invitationStatus.messages.loading";

    function validId(value){
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value || ""
        );
    }

    function statusKey(status){
        const known=["pending","accepted","declined","revoked"];

        if(known.includes(status)){
            return "invite.status."+status;
        }

        return "invite.status.unknown";
    }

    function render(){
        const language=i18next.resolvedLanguage || "en";

        list.replaceChildren();
        refreshButton.disabled=busy;
        membersLink.hidden=true;
        inviteLink.hidden=true;

        message.textContent=i18next.t(messageKey);
        empty.hidden=!loaded || invitations.length>0;

        if(team){
            summary.textContent=i18next.t("members.summary",{
                team:team.name,
                project:team.project_name
            });

            membersLink.href="team-members.html?teamId="+
                encodeURIComponent(teamId);
            membersLink.hidden=false;

            if(owner){
                inviteLink.href="invite-members.html?teamId="+
                    encodeURIComponent(teamId);
                inviteLink.hidden=false;
            }
        }else{
            summary.textContent="";
        }

        const dateFormatter=new Intl.DateTimeFormat(language,{
            dateStyle:"medium",
            timeStyle:"short"
        });

        invitations.forEach(function(invitation){
            const item=document.createElement("li");
            const details=document.createElement("div");
            const text=document.createElement("p");

            text.textContent=i18next.t("invite.statusRow",{
                email:invitation.invited_email,
                status:i18next.t(statusKey(invitation.status))
            });

            details.append(text);

            if(invitation.created_at){
                const date=new Date(invitation.created_at);

                if(!Number.isNaN(date.getTime())){
                    const time=document.createElement("time");

                    time.dateTime=date.toISOString();
                    time.textContent=i18next.t(
                        "invitationStatus.createdAt",
                        {
                            date:dateFormatter.format(date)
                        }
                    );

                    details.append(time);
                }
            }

            item.append(details);
            list.append(item);
        });
    }

    async function loadInvitations(){
        if(busy){
            return;
        }

        busy=true;
        loaded=false;
        team=null;
        owner=false;
        invitations=[];
        messageKey="invitationStatus.messages.loading";
        render();

        try{
            if(!validId(teamId)){
                messageKey="invitationStatus.errors.missingTeam";
                return;
            }

            const {data:authData,error:authError}=
                await database.auth.getUser();

            if(authError || !authData.user){
                messageKey="invitationStatus.errors.loginRequired";
                return;
            }

            const {data:teamData,error:teamError}=await database
                .from("teams")
                .select("id,name,project_name,owner_id")
                .eq("id",teamId)
                .maybeSingle();

            if(teamError){
                messageKey="invitationStatus.errors.connection";
                return;
            }

            if(!teamData){
                messageKey="invitationStatus.errors.unavailable";
                return;
            }

            team=teamData;
            owner=team.owner_id===authData.user.id;

            const {data:invitationData,error:invitationError}=
                await database
                    .from("invitations")
                    .select("id,invited_email,status,created_at")
                    .eq("team_id",teamId)
                    .order("created_at",{ascending:false});

            if(invitationError || !Array.isArray(invitationData)){
                messageKey="invitationStatus.errors.connection";
                return;
            }

            invitations=invitationData;
            loaded=true;
            messageKey="invitationStatus.messages.loaded";

        }catch(error){
            messageKey="invitationStatus.errors.connection";
        }finally{
            busy=false;
            render();
        }
    }

    function start(){
        if(started){
            return;
        }

        started=true;

        refreshButton.addEventListener("click",loadInvitations);

        i18next.on("languageChanged",function(){
            render();
        });

        loadInvitations();
    }

    if(window.i18next){
        if(i18next.isInitialized){
            start();
        }else{
            i18next.on("initialized",start);
        }
    }
})();