(function(){
    const params=new URLSearchParams(window.location.search);
    const teamId=params.get("teamId");

    const message=document.querySelector("#complete-message");
    const summary=document.querySelector("#complete-summary");
    const teamName=document.querySelector("#complete-team-name");
    const projectName=document.querySelector("#complete-project-name");
    const memberCount=document.querySelector("#complete-member-count");
    const pendingCount=document.querySelector("#complete-pending-count");

    const navigation=document.querySelector("#complete-navigation");
    const membersLink=document.querySelector("#complete-members-link");
    const statusLink=document.querySelector("#complete-status-link");

    const preferencesNote=document.querySelector(
        "#complete-preferences-note"
    );

    const preferencesButton=document.querySelector(
        "#complete-preferences"
    );

    const refreshButton=document.querySelector("#complete-refresh");

    let team=null;
    let joinedMembers=0;
    let pendingInvitations=0;
    let ready=false;
    let busy=false;
    let started=false;
    let messageKey="completion.messages.loading";

    function validId(value){
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value || ""
        );
    }

    function render(){
        message.textContent=i18next.t(messageKey);

        summary.hidden=!ready;
        navigation.hidden=!ready;
        preferencesNote.hidden=!ready;

        preferencesButton.disabled=busy || !ready;
        refreshButton.disabled=busy;

        teamName.textContent=ready ? team.name : "";
        projectName.textContent=ready ? team.project_name : "";

        memberCount.textContent=ready
            ? i18next.t("members.count",{count:joinedMembers})
            : "";

        pendingCount.textContent=ready
            ? i18next.t("completion.pending",{
                count:pendingInvitations
            })
            : "";

        if(ready){
            membersLink.href="team-members.html?teamId="+
                encodeURIComponent(teamId);

            statusLink.href="invitation-status.html?teamId="+
                encodeURIComponent(teamId);
        }else{
            membersLink.removeAttribute("href");
            statusLink.removeAttribute("href");
        }
    }

    async function loadTeam(){
        if(busy){
            return;
        }

        busy=true;
        ready=false;
        team=null;
        joinedMembers=0;
        pendingInvitations=0;

        messageKey="completion.messages.loading";
        render();

        try{
            if(!validId(teamId)){
                messageKey="completion.errors.missingTeam";
                return;
            }

            const {data:authData,error:authError}=
                await database.auth.getUser();

            if(authError || !authData.user){
                messageKey="completion.errors.loginRequired";
                return;
            }

            const {data:teamData,error:teamError}=await database
                .from("teams")
                .select("id,name,project_name")
                .eq("id",teamId)
                .maybeSingle();

            if(teamError){
                messageKey="completion.errors.connection";
                return;
            }

            if(!teamData){
                messageKey="completion.errors.unavailable";
                return;
            }

            const {data:members,error:membersError}=
                await database.rpc("get_team_members",{
                    p_team_id:teamId
                });

            if(membersError || !Array.isArray(members)){
                messageKey="completion.errors.connection";
                return;
            }

            if(members.length===0){
                messageKey="completion.errors.unavailable";
                return;
            }

            const {count,error:invitationsError}=await database
                .from("invitations")
                .select("id",{count:"exact",head:true})
                .eq("team_id",teamId)
                .eq("status","pending");

            if(invitationsError || typeof count!=="number"){
                messageKey="completion.errors.connection";
                return;
            }

            team=teamData;
            joinedMembers=members.length;
            pendingInvitations=count;

            ready=true;
            messageKey="completion.messages.saved";

        }catch(error){
            messageKey="completion.errors.connection";
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

        refreshButton.addEventListener("click",loadTeam);

        preferencesButton.addEventListener("click",function(){
            if(!ready || busy){
                return;
            }

            window.location.href=
                "../erdeta/communication.html?teamId="+
                encodeURIComponent(teamId);
        });

        i18next.on("languageChanged",function(){
            render();
        });

        loadTeam();
    }

    if(window.i18next){
        if(i18next.isInitialized){
            start();
        }else{
            i18next.on("initialized",start);
        }
    }
})();