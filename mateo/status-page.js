(function(){
    const params=new URLSearchParams(window.location.search);
    const teamId=params.get("teamId");
    const selector=document.querySelector("#language-select");

    const translations={
        en:{
            heading:"Invitation status",
            listHeading:"Team invitations",
            deliveryNote:"These statuses track invitation responses. Invitation emails are not sent automatically.",
            refresh:"Refresh",
            members:"View team members",
            invite:"Invite members",
            statusLink:"View invitation status",
            loading:"Loading invitations...",
            loaded:"Invitation information loaded.",
            noInvitations:"No invitations created yet.",
            invalidTeam:"No valid team was selected. Open this page from Team members.",
            loginRequired:"Please log in to view this team.",
            unavailable:"Team unavailable or you do not have access.",
            loadError:"Could not load invitation information. Check your connection and press Refresh.",
            pending:"Awaiting response",
            accepted:"Accepted",
            declined:"Declined",
            revoked:"Revoked",
            unknown:"Unknown status",
            navigation:"Invitation navigation"
        },
        hr:{
            heading:"Status pozivnica",
            listHeading:"Pozivnice tima",
            deliveryNote:"Ovi statusi prikazuju odgovore na pozivnice. E-poruke s pozivnicama ne šalju se automatski.",
            refresh:"Osvježi",
            members:"Prikaži članove tima",
            invite:"Pozovi članove",
            statusLink:"Prikaži status pozivnica",
            loading:"Učitavanje pozivnica...",
            loaded:"Podaci o pozivnicama su učitani.",
            noInvitations:"Još nema izrađenih pozivnica.",
            invalidTeam:"Nije odabran valjan tim. Otvorite ovu stranicu putem stranice Članovi tima.",
            loginRequired:"Prijavite se za pregled ovog tima.",
            unavailable:"Tim nije dostupan ili nemate pristup.",
            loadError:"Podatke o pozivnicama nije moguće učitati. Provjerite vezu i pritisnite Osvježi.",
            pending:"Čeka se odgovor",
            accepted:"Prihvaćeno",
            declined:"Odbijeno",
            revoked:"Opozvano",
            unknown:"Nepoznat status",
            navigation:"Navigacija pozivnica"
        },
        sq:{
            heading:"Statusi i ftesave",
            listHeading:"Ftesat e ekipit",
            deliveryNote:"Këto statuse tregojnë përgjigjet ndaj ftesave. Emailet e ftesave nuk dërgohen automatikisht.",
            refresh:"Rifresko",
            members:"Shiko anëtarët e ekipit",
            invite:"Fto anëtarë",
            statusLink:"Shiko statusin e ftesave",
            loading:"Duke ngarkuar ftesat...",
            loaded:"Informacioni i ftesave u ngarkua.",
            noInvitations:"Ende nuk është krijuar asnjë ftesë.",
            invalidTeam:"Nuk është zgjedhur një ekip i vlefshëm. Hapeni këtë faqe nga faqja e anëtarëve të ekipit.",
            loginRequired:"Hyni për të parë këtë ekip.",
            unavailable:"Ekipi nuk është i disponueshëm ose nuk keni qasje.",
            loadError:"Informacioni i ftesave nuk mund të ngarkohej. Kontrolloni lidhjen dhe shtypni Rifresko.",
            pending:"Në pritje të përgjigjes",
            accepted:"Pranuar",
            declined:"Refuzuar",
            revoked:"Anuluar",
            unknown:"Status i panjohur",
            navigation:"Navigimi i ftesave"
        }
    };

    function currentLanguage(){
        const selected=selector ? selector.value : "en";

        return Object.hasOwn(translations,selected)
            ? selected
            : "en";
    }

    function text(key){
        return translations[currentLanguage()][key];
    }

    function updateLabels(){
        document.querySelectorAll("[data-status-label]").forEach(function(element){
            const key=element.getAttribute("data-status-label");

            if(Object.hasOwn(translations.en,key)){
                element.textContent=text(key);
            }
        });
    }

    document.querySelectorAll("[data-team-page]").forEach(function(link){
        const page=link.getAttribute("data-team-page");

        if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId || "")){
            link.href=page+"?teamId="+encodeURIComponent(teamId);
        }else{
            link.hidden=true;
        }
    });

    updateLabels();

    const list=document.querySelector("#status-list");

    if(!list){
        if(selector){
            selector.addEventListener("change",updateLabels);
        }

        return;
    }

    const teamSummary=document.querySelector("#status-team");
    const empty=document.querySelector("#status-empty");
    const message=document.querySelector("#status-message");
    const refreshButton=document.querySelector("#status-refresh");
    const inviteLink=document.querySelector("#status-invite-link");
    const navigation=document.querySelector("#status-navigation");

    let invitations=[];
    let team=null;
    let owner=false;
    let busy=false;
    let messageKey="loading";

    function render(){
        updateLabels();
        list.replaceChildren();

        document.title=text("heading")+" | Group Project Contract";
        navigation.setAttribute("aria-label",text("navigation"));

        teamSummary.textContent=team
            ? team.name+" — "+team.project_name
            : "";

        refreshButton.disabled=busy;
        inviteLink.hidden=!owner;
        message.textContent=text(messageKey);

        empty.hidden=messageKey!=="loaded" || invitations.length>0;
        empty.textContent=text("noInvitations");

        invitations.forEach(function(invitation){
            const item=document.createElement("li");
            const label=document.createElement("span");

            const knownStatus=["pending","accepted","declined","revoked"]
                .includes(invitation.status);

            const status=knownStatus
                ? text(invitation.status)
                : text("unknown");

            label.textContent=invitation.invited_email+" — "+status;
            item.append(label);
            list.append(item);
        });
    }

    async function loadStatus(){
        if(busy){
            return;
        }

        busy=true;
        team=null;
        owner=false;
        invitations=[];
        messageKey="loading";
        render();

        try{
            const validTeam=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId || "");

            if(!validTeam){
                messageKey="invalidTeam";
                return;
            }

            const {data:userData,error:userError}=await database.auth.getUser();

            if(userError || !userData.user){
                messageKey="loginRequired";
                return;
            }

            const {data:teamData,error:teamError}=await database
                .from("teams")
                .select("id,name,project_name,owner_id")
                .eq("id",teamId)
                .single();

            if(teamError || !teamData){
                messageKey="unavailable";
                return;
            }

            team=teamData;
            owner=team.owner_id===userData.user.id;

            const {data,error}=await database
                .from("invitations")
                .select("id,invited_email,status")
                .eq("team_id",teamId)
                .order("created_at",{ascending:false});

            if(error){
                messageKey="loadError";
                return;
            }

            invitations=data;
            messageKey="loaded";
        }catch(error){
            messageKey="loadError";
        }finally{
            busy=false;
            render();
        }
    }

    if(selector){
        selector.addEventListener("change",render);
    }

    refreshButton.addEventListener("click",loadStatus);

    loadStatus();
})();