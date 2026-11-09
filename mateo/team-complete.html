(function(){
    const params=new URLSearchParams(window.location.search);
    const teamId=params.get("teamId");
    const selector=document.querySelector("#language-select");
    const openSetup=document.querySelector("#open-team-setup");

    const translations={
        en:{
            title:"Team setup",
            complete:"Team setup complete",
            review:"Review team setup",
            loading:"Loading your team...",
            saved:"Your team and project are saved.",
            invalid:"No valid team was selected.",
            login:"Please log in to view your team.",
            unavailable:"Team unavailable or you do not have access.",
            error:"Could not load the team summary. Check your connection and press Refresh.",
            team:"Team name",
            project:"Project name",
            members:"View team members",
            status:"View invitation status",
            pending:"Pending invitations: {count}",
            member_one:"{count} joined member",
            member_other:"{count} joined members",
            preferences:"Continue to preferences",
            note:"Next, choose your working preferences. Your preference answers are currently saved only in this browser.",
            refresh:"Refresh",
            navigation:"Team navigation"
        },
        hr:{
            title:"Postavljanje tima",
            complete:"Postavljanje tima je dovršeno",
            review:"Pregled postavljanja tima",
            loading:"Učitavanje tima...",
            saved:"Vaš tim i projekt su spremljeni.",
            invalid:"Nije odabran valjan tim.",
            login:"Prijavite se za pregled svojeg tima.",
            unavailable:"Tim nije dostupan ili nemate pristup.",
            error:"Sažetak tima nije moguće učitati. Provjerite vezu i pritisnite Osvježi.",
            team:"Naziv tima",
            project:"Naziv projekta",
            members:"Prikaži članove tima",
            status:"Prikaži status pozivnica",
            pending:"Pozivnice na čekanju: {count}",
            member_one:"{count} pridruženi član",
            member_few:"{count} pridružena člana",
            member_other:"{count} pridruženih članova",
            preferences:"Nastavi na preferencije",
            note:"Zatim odaberite svoje radne preferencije. Vaši odgovori trenutačno se spremaju samo u ovom pregledniku.",
            refresh:"Osvježi",
            navigation:"Navigacija tima"
        },
        sq:{
            title:"Konfigurimi i ekipit",
            complete:"Konfigurimi i ekipit përfundoi",
            review:"Shiko konfigurimin e ekipit",
            loading:"Duke ngarkuar ekipin...",
            saved:"Ekipi dhe projekti juaj janë ruajtur.",
            invalid:"Nuk është zgjedhur një ekip i vlefshëm.",
            login:"Hyni për të parë ekipin tuaj.",
            unavailable:"Ekipi nuk është i disponueshëm ose nuk keni qasje.",
            error:"Përmbledhja e ekipit nuk mund të ngarkohej. Kontrolloni lidhjen dhe shtypni Rifresko.",
            team:"Emri i ekipit",
            project:"Emri i projektit",
            members:"Shiko anëtarët e ekipit",
            status:"Shiko statusin e ftesave",
            pending:"Ftesat në pritje: {count}",
            member_one:"{count} anëtar i bashkuar",
            member_other:"{count} anëtarë të bashkuar",
            preferences:"Vazhdo te preferencat",
            note:"Më pas zgjidhni preferencat tuaja të punës. Përgjigjet tuaja aktualisht ruhen vetëm në këtë shfletues.",
            refresh:"Rifresko",
            navigation:"Navigimi i ekipit"
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

    function validTeam(){
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId || "");
    }

    function updateSetupLink(){
        if(!openSetup){
            return;
        }

        openSetup.textContent=text("review");
        openSetup.hidden=!validTeam();

        if(validTeam()){
            openSetup.href="team-complete.html?teamId="+encodeURIComponent(teamId);
        }
    }

    updateSetupLink();

    const heading=document.querySelector("#complete-heading");

    if(!heading){
        if(selector){
            selector.addEventListener("change",updateSetupLink);
        }

        return;
    }

    const message=document.querySelector("#complete-message");
    const summary=document.querySelector("#complete-summary");
    const navigation=document.querySelector("#complete-navigation");
    const refresh=document.querySelector("#complete-refresh");
    const membersLink=document.querySelector("#complete-members-link");
    const statusLink=document.querySelector("#complete-status-link");
    const preferencesButton=document.querySelector("#complete-preferences");

    let team=null;
    let memberCount=0;
    let pendingCount=0;
    let busy=false;
    let messageKey="loading";

    function render(){
        const ready=team!==null && messageKey==="saved";

        document.title=text("title")+" | Group Project Contract";
        heading.textContent=text(ready ? "complete" : "title");
        message.textContent=text(messageKey);

        summary.hidden=!ready;
        navigation.hidden=!ready;
        refresh.disabled=busy;
        refresh.textContent=text("refresh");

        navigation.setAttribute("aria-label",text("navigation"));

        document.querySelector("#complete-team-label").textContent=text("team");
        document.querySelector("#complete-project-label").textContent=text("project");

        preferencesButton.textContent=text("preferences");
        preferencesButton.disabled=!ready || busy;

        document.querySelector("#complete-preferences-note").textContent=ready
            ? text("note")
            : "";

        membersLink.textContent=text("members");
        statusLink.textContent=text("status");

        if(!ready){
            return;
        }

        document.querySelector("#complete-team-name").textContent=team.name;
        document.querySelector("#complete-project-name").textContent=team.project_name;

        const category=new Intl.PluralRules(language()).select(memberCount);
        const countKey="member_"+category;
        const labels=translations[language()];

        const countTemplate=Object.hasOwn(labels,countKey)
            ? labels[countKey]
            : labels.member_other;

        const number=new Intl.NumberFormat(language());

        document.querySelector("#complete-member-count").textContent=
            countTemplate.replace("{count}",number.format(memberCount));

        document.querySelector("#complete-pending-count").textContent=
            text("pending").replace("{count}",number.format(pendingCount));

        membersLink.href="team-members.html?teamId="+encodeURIComponent(teamId);
        statusLink.href="invitation-status.html?teamId="+encodeURIComponent(teamId);
    }

    async function loadTeam(){
        if(busy){
            return;
        }

        busy=true;
        team=null;
        messageKey="loading";
        render();

        try{
            if(!validTeam()){
                messageKey="invalid";
                return;
            }

            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                messageKey="login";
                return;
            }

            const {data:teamData,error:teamError}=await database
                .from("teams")
                .select("id,name,project_name")
                .eq("id",teamId)
                .single();

            if(teamError || !teamData){
                messageKey="unavailable";
                return;
            }

            const {data:members,error:membersError}=await database.rpc(
                "get_team_members",
                {p_team_id:teamId}
            );

            if(membersError || !members || members.length===0){
                messageKey="error";
                return;
            }

            const {count,error:invitationError}=await database
                .from("invitations")
                .select("id",{count:"exact",head:true})
                .eq("team_id",teamId)
                .eq("status","pending");

            if(invitationError){
                messageKey="error";
                return;
            }

            team=teamData;
            memberCount=members.length;
            pendingCount=count || 0;
            messageKey="saved";
        }catch(error){
            messageKey="error";
        }finally{
            busy=false;
            render();
        }
    }

    preferencesButton.addEventListener("click",function(){
        if(busy || !team || messageKey!=="saved"){
            return;
        }

        window.location.href="../erdeta/communication.html?teamId="+encodeURIComponent(teamId);
    });

    if(selector){
        selector.addEventListener("change",render);
    }

    refresh.addEventListener("click",loadTeam);

    loadTeam();
})();