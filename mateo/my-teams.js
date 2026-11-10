(function(){
    const selector=document.querySelector("#language-select");

    const translations={
        en:{
            heading:"My teams",
            create:"Create a team",
            login:"Log in",
            logout:"Log out",
            refresh:"Refresh",
            loading:"Loading your teams...",
            empty:"You have not created or joined a team yet.",
            loaded:"Your teams are listed below.",
            loginRequired:"Please log in to view your teams.",
            loadError:"Could not load your teams. Check your connection and press Refresh.",
            logoutError:"Could not complete logout. Please try again.",
            loggingOut:"Logging out...",
            owner:"Owner",
            member:"Member",
            open:"Open team",
            navigation:"My teams navigation"
        },
        hr:{
            heading:"Moji timovi",
            create:"Stvori tim",
            login:"Prijavi se",
            logout:"Odjavi se",
            refresh:"Osvježi",
            loading:"Učitavanje vaših timova...",
            empty:"Još niste stvorili tim niti se pridružili timu.",
            loaded:"Vaši timovi prikazani su u nastavku.",
            loginRequired:"Prijavite se za pregled svojih timova.",
            loadError:"Timove nije moguće učitati. Provjerite vezu i pritisnite Osvježi.",
            logoutError:"Odjavu nije moguće dovršiti. Pokušajte ponovno.",
            loggingOut:"Odjava u tijeku...",
            owner:"Vlasnik",
            member:"Član",
            open:"Otvori tim",
            navigation:"Navigacija mojih timova"
        },
        sq:{
            heading:"Ekipet e mia",
            create:"Krijo një ekip",
            login:"Hyr",
            logout:"Dil",
            refresh:"Rifresko",
            loading:"Duke ngarkuar ekipet tuaja...",
            empty:"Ende nuk keni krijuar ose nuk jeni bashkuar me ndonjë ekip.",
            loaded:"Ekipet tuaja janë renditur më poshtë.",
            loginRequired:"Hyni për të parë ekipet tuaja.",
            loadError:"Ekipet nuk mund të ngarkoheshin. Kontrolloni lidhjen dhe shtypni Rifresko.",
            logoutError:"Dalja nuk mund të përfundohej. Provoni përsëri.",
            loggingOut:"Duke dalë...",
            owner:"Pronar",
            member:"Anëtar",
            open:"Hap ekipin",
            navigation:"Navigimi i ekipeve të mia"
        }
    };

    function language(){
        const selected=selector ? selector.value : "en";

        return Object.hasOwn(translations,selected)
            ? selected
            : "en";
    }

    function text(key){
        return translations[language()][key];
    }

    function updateLinks(){
        document.querySelectorAll("[data-my-teams-link]").forEach(function(link){
            link.textContent=text("heading");
        });
    }

    updateLinks();

    const list=document.querySelector("#teams-list");

    if(!list){
        if(selector){
            selector.addEventListener("change",updateLinks);
        }

        return;
    }

    const message=document.querySelector("#teams-message");
    const account=document.querySelector("#teams-account");
    const refresh=document.querySelector("#teams-refresh");
    const logout=document.querySelector("#teams-logout");
    const createLink=document.querySelector("#teams-create");
    const loginLink=document.querySelector("#teams-login");
    const navigation=document.querySelector("#teams-navigation");

    let teams=[];
    let user=null;
    let busy=false;
    let loggingOut=false;
    let messageKey="loading";
    let requestVersion=0;

    function render(){
        document.title=text("heading")+" | Group Project Contract";

        document.querySelectorAll("[data-teams-label]").forEach(function(element){
            const key=element.getAttribute("data-teams-label");

            if(Object.hasOwn(translations.en,key)){
                element.textContent=text(key);
            }
        });

        navigation.setAttribute("aria-label",text("navigation"));

        account.textContent=user ? user.email : "";
        message.textContent=text(messageKey);
        refresh.disabled=busy || loggingOut;
        logout.disabled=busy || loggingOut;

        logout.hidden=!user;
        createLink.hidden=!user;
        loginLink.hidden=busy || Boolean(user);

        list.replaceChildren();

        teams.forEach(function(team){
            const card=document.createElement("section");
            const heading=document.createElement("h2");
            const project=document.createElement("p");
            const role=document.createElement("p");
            const link=document.createElement("a");

            card.className="status-card";
            heading.textContent=team.name;
            project.textContent=team.project_name;

            role.textContent=text(
                team.owner_id===user.id ? "owner" : "member"
            );

            link.className="button button-secondary";
            link.textContent=text("open");
            link.href="team-members.html?teamId="+encodeURIComponent(team.id);

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
        teams=[];
        user=null;
        messageKey="loading";
        render();

        try{
            const {data:userData,error:userError}=await database.auth.getUser();

            if(version!==requestVersion){
                return;
            }

            if(userError || !userData.user){
                messageKey="loginRequired";
                return;
            }

            user=userData.user;

            const {data,error}=await database
                .from("teams")
                .select("id,name,project_name,owner_id")
                .order("created_at",{ascending:false});

            if(version!==requestVersion){
                return;
            }

            if(error){
                messageKey="loadError";
                return;
            }

            teams=data;
            messageKey=teams.length>0 ? "loaded" : "empty";
        }catch(error){
            if(version===requestVersion){
                messageKey="loadError";
            }
        }finally{
            if(version===requestVersion){
                busy=false;
                render();
            }
        }
    }

    logout.addEventListener("click",async function(){
        if(busy || loggingOut){
            return;
        }

        loggingOut=true;
        requestVersion++;
        teams=[];
        messageKey="loggingOut";
        render();

        try{
            const {error}=await database.auth.signOut({scope:"local"});

            if(error){
                const {data:sessionData}=await database.auth.getSession();

                if(sessionData.session){
                    messageKey="logoutError";
                    return;
                }
            }

            user=null;
            window.location.replace("index.html");
        }catch(error){
            messageKey="logoutError";
        }finally{
            loggingOut=false;
            render();
        }
    });

    database.auth.onAuthStateChange(function(event){
        if(event==="SIGNED_OUT"){
            requestVersion++;
            teams=[];
            user=null;
            busy=false;
            messageKey=loggingOut ? "loggingOut" : "loginRequired";
            render();
        }
    });

    if(selector){
        selector.addEventListener("change",render);
    }

    refresh.addEventListener("click",loadTeams);

    loadTeams();
})();