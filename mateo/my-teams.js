(function(){
    const account=document.querySelector("#teams-account");
    const message=document.querySelector("#teams-message");
    const list=document.querySelector("#teams-list");

    const createLink=document.querySelector("#teams-create");
    const loginLink=document.querySelector("#teams-login");
    const refreshButton=document.querySelector("#teams-refresh");
    const logoutButton=document.querySelector("#teams-logout");

    let user=null;
    let teams=[];
    let busy=false;
    let loggingOut=false;
    let started=false;
    let requestVersion=0;
    let messageKey="myTeams.messages.loading";

    function render(){
        account.textContent=user ? user.email : "";
        message.textContent=i18next.t(messageKey);

        createLink.hidden=!user || loggingOut;
        loginLink.hidden=!!user || busy || loggingOut;

        refreshButton.disabled=busy || loggingOut;
        logoutButton.hidden=!user;
        logoutButton.disabled=busy || loggingOut;

        list.replaceChildren();

        if(!user || loggingOut){
            return;
        }

        teams.forEach(function(team){
            const card=document.createElement("section");
            const heading=document.createElement("h2");
            const project=document.createElement("p");
            const role=document.createElement("p");
            const link=document.createElement("a");

            card.className="status-card";

            heading.textContent=team.name;
            project.textContent=team.project_name;

            role.textContent=i18next.t(
                team.owner_id===user.id
                    ? "members.roles.owner"
                    : "members.roles.member"
            );

            link.className="button button-secondary";
            link.href="team-members.html?teamId="+
                encodeURIComponent(team.id);
            link.textContent=i18next.t("myTeams.openButton");

            card.append(heading,project,role,link);
            list.append(card);
        });
    }

    async function loadTeams(){
        if(busy || loggingOut){
            return;
        }

        const version=++requestVersion;

        busy=true;
        user=null;
        teams=[];
        messageKey="myTeams.messages.loading";
        render();

        try{
            const {data:authData,error:authError}=
                await database.auth.getUser();

            if(version!==requestVersion){
                return;
            }

            if(authError || !authData.user){
                messageKey="myTeams.errors.loginRequired";
                return;
            }

            user=authData.user;

            const {data,error}=await database
                .from("teams")
                .select("id,name,project_name,owner_id")
                .order("created_at",{ascending:false});

            if(version!==requestVersion){
                return;
            }

            if(error || !Array.isArray(data)){
                messageKey="myTeams.errors.connection";
                return;
            }

            teams=data;

            messageKey=teams.length>0
                ? "myTeams.messages.loaded"
                : "myTeams.messages.empty";

        }catch(error){
            if(version===requestVersion){
                messageKey="myTeams.errors.connection";
            }
        }finally{
            if(version===requestVersion){
                busy=false;
                render();
            }
        }
    }

    async function logout(){
        if(busy || loggingOut || !user){
            return;
        }

        loggingOut=true;
        requestVersion++;
        teams=[];

        messageKey="myTeams.messages.loggingOut";
        render();

        try{
            const {error}=await database.auth.signOut({
                scope:"local"
            });

            if(error){
                loggingOut=false;
                messageKey="myTeams.errors.logout";
                render();
                return;
            }

            window.location.replace("index.html");

        }catch(error){
            loggingOut=false;
            messageKey="myTeams.errors.logout";
            render();
        }
    }

    function start(){
        if(started){
            return;
        }

        started=true;

        refreshButton.addEventListener("click",loadTeams);
        logoutButton.addEventListener("click",logout);

        i18next.on("languageChanged",function(){
            render();
        });

        database.auth.onAuthStateChange(function(event){
            if(event==="SIGNED_OUT"){
                requestVersion++;

                user=null;
                teams=[];
                busy=false;

                messageKey=loggingOut
                    ? "myTeams.messages.loggingOut"
                    : "myTeams.errors.loginRequired";

                render();
            }
        });

        loadTeams();
    }

    if(window.i18next){
        if(i18next.isInitialized){
            start();
        }else{
            i18next.on("initialized",start);
        }
    }
})();