(function(){
    const selector=document.querySelector("#language-select");
    const params=new URLSearchParams(window.location.search);
    const teamId=params.get("teamId");
    const editLink=document.querySelector("#edit-team-link");

    const translations={
        en:{
            heading:"Edit team",
            teamName:"Team name",
            projectName:"Project name",
            description:"Project description",
            save:"Save changes",
            delete:"Delete team",
            retry:"Try again",
            back:"Back to my teams",
            loading:"Loading team details...",
            ready:"Update the details below.",
            saving:"Saving changes...",
            saved:"Changes saved.",
            deleting:"Deleting team...",
            invalid:"No valid team was selected.",
            loginRequired:"Please log in first.",
            ownerOnly:"Only the team owner can edit this team.",
            loadError:"Could not load the team. Check your connection and try again.",
            saveError:"Could not confirm saving. Check the saved team before trying again.",
            deleteError:"Could not confirm deletion. Check My teams before trying again.",
            required:"Please complete all fields.",
            confirm:'Delete "{name}" permanently?\n\nIts project details, invitations, and team memberships will also be deleted. This cannot be undone.'
        },
        hr:{
            heading:"Uredi tim",
            teamName:"Naziv tima",
            projectName:"Naziv projekta",
            description:"Opis projekta",
            save:"Spremi promjene",
            delete:"Izbriši tim",
            retry:"Pokušaj ponovno",
            back:"Natrag na moje timove",
            loading:"Učitavanje podataka o timu...",
            ready:"Uredite podatke u nastavku.",
            saving:"Spremanje promjena...",
            saved:"Promjene su spremljene.",
            deleting:"Brisanje tima...",
            invalid:"Nije odabran valjan tim.",
            loginRequired:"Najprije se prijavite.",
            ownerOnly:"Samo vlasnik tima može uređivati ovaj tim.",
            loadError:"Tim nije moguće učitati. Provjerite vezu i pokušajte ponovno.",
            saveError:"Spremanje nije moguće potvrditi. Provjerite spremljeni tim prije ponovnog pokušaja.",
            deleteError:"Brisanje nije moguće potvrditi. Provjerite Moje timove prije ponovnog pokušaja.",
            required:"Ispunite sva polja.",
            confirm:'Trajno izbrisati tim "{name}"?\n\nIzbrisat će se i detalji projekta, pozivnice i članstva u timu. Ovu radnju nije moguće poništiti.'
        },
        sq:{
            heading:"Ndrysho ekipin",
            teamName:"Emri i ekipit",
            projectName:"Emri i projektit",
            description:"Përshkrimi i projektit",
            save:"Ruaj ndryshimet",
            delete:"Fshi ekipin",
            retry:"Provo përsëri",
            back:"Kthehu te ekipet e mia",
            loading:"Duke ngarkuar detajet e ekipit...",
            ready:"Ndryshoni detajet më poshtë.",
            saving:"Duke ruajtur ndryshimet...",
            saved:"Ndryshimet u ruajtën.",
            deleting:"Duke fshirë ekipin...",
            invalid:"Nuk është zgjedhur një ekip i vlefshëm.",
            loginRequired:"Ju lutemi hyni fillimisht.",
            ownerOnly:"Vetëm pronari mund ta ndryshojë këtë ekip.",
            loadError:"Ekipi nuk mund të ngarkohej. Kontrolloni lidhjen dhe provoni përsëri.",
            saveError:"Ruajtja nuk mund të konfirmohej. Kontrolloni ekipin e ruajtur përpara se të provoni përsëri.",
            deleteError:"Fshirja nuk mund të konfirmohej. Kontrolloni Ekipet e mia përpara se të provoni përsëri.",
            required:"Plotësoni të gjitha fushat.",
            confirm:'Ta fshini përgjithmonë ekipin "{name}"?\n\nDo të fshihen edhe detajet e projektit, ftesat dhe anëtarësimet në ekip. Ky veprim nuk mund të zhbëhet.'
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

    async function getOwnedTeam(){
        if(!validTeam()){
            throw new Error("invalid");
        }

        const {data:userData,error:userError}=await database.auth.getUser();

        if(userError || !userData.user){
            throw new Error("loginRequired");
        }

        const {data,error}=await database
            .from("teams")
            .select("id,name,project_name,description,owner_id")
            .eq("id",teamId)
            .single();

        if(error || !data || data.owner_id!==userData.user.id){
            throw new Error("ownerOnly");
        }

        return data;
    }

    function updateEditLink(){
        if(editLink){
            editLink.textContent=text("heading");
        }
    }

    updateEditLink();

    const form=document.querySelector("#edit-team-form");

    if(!form){
        if(editLink){
            getOwnedTeam().then(function(){
                editLink.href="edit-team.html?teamId="+encodeURIComponent(teamId);
                editLink.hidden=false;
            }).catch(function(){
                editLink.hidden=true;
            });
        }

        if(selector){
            selector.addEventListener("change",updateEditLink);
        }

        return;
    }

    const nameInput=document.querySelector("#edit-team-name");
    const projectInput=document.querySelector("#edit-project-name");
    const descriptionInput=document.querySelector("#edit-description");
    const message=document.querySelector("#edit-message");
    const saveButton=document.querySelector("#edit-save");
    const deleteButton=document.querySelector("#edit-delete");
    const retryButton=document.querySelector("#edit-retry");

    let team=null;
    let busy=false;
    let messageKey="loading";

    function render(){
        document.title=text("heading")+" | Group Project Contract";

        document.querySelectorAll("[data-edit-label]").forEach(function(element){
            const key=element.getAttribute("data-edit-label");
            element.textContent=text(key);
        });

        message.textContent=text(messageKey);
        form.hidden=!team;
        retryButton.hidden=Boolean(team);
        retryButton.disabled=busy;
        saveButton.disabled=busy;
        deleteButton.disabled=busy;

        [nameInput,projectInput,descriptionInput].forEach(function(input){
            input.disabled=busy;
        });
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
            team=await getOwnedTeam();

            nameInput.value=team.name;
            projectInput.value=team.project_name;
            descriptionInput.value=team.description;
            messageKey="ready";
        }catch(error){
            messageKey=Object.hasOwn(translations.en,error.message)
                ? error.message
                : "loadError";
        }finally{
            busy=false;
            render();
        }
    }

    form.addEventListener("submit",async function(event){
        event.preventDefault();

        if(busy || !team){
            return;
        }

        const fields=[nameInput,projectInput,descriptionInput];
        const missing=fields.find(function(input){
            return input.value.trim()==="";
        });

        if(missing){
            messageKey="required";
            render();
            missing.focus();
            return;
        }

        busy=true;
        messageKey="saving";
        render();

        try{
            const {data,error}=await database
                .from("teams")
                .update({
                    name:nameInput.value.trim(),
                    project_name:projectInput.value.trim(),
                    description:descriptionInput.value.trim()
                })
                .eq("id",teamId)
                .eq("owner_id",team.owner_id)
                .select("id,name,project_name,description,owner_id")
                .single();

            if(error || !data){
                messageKey="saveError";
                return;
            }

            team=data;
            messageKey="saved";
        }catch(error){
            messageKey="saveError";
        }finally{
            busy=false;
            render();
        }
    });

    deleteButton.addEventListener("click",async function(){
        if(busy || !team){
            return;
        }

        const confirmation=text("confirm").replace("{name}",function(){
            return team.name;
        });

        if(!window.confirm(confirmation)){
            return;
        }

        busy=true;
        messageKey="deleting";
        render();

        try{
            const {data,error}=await database
                .from("teams")
                .delete()
                .eq("id",teamId)
                .eq("owner_id",team.owner_id)
                .select("id");

            if(error || !data || data.length!==1){
                messageKey="deleteError";
                return;
            }

            window.location.replace("my-teams.html");
        }catch(error){
            messageKey="deleteError";
        }finally{
            busy=false;
            render();
        }
    });

    [nameInput,projectInput,descriptionInput].forEach(function(input){
        input.addEventListener("input",function(){
            input.setCustomValidity("");
        });

        input.addEventListener("invalid",function(){
            input.setCustomValidity("");

            if(input.validity.valueMissing){
                input.setCustomValidity(text("required"));
            }
        });
    });

    if(selector){
        selector.addEventListener("change",function(){
            [nameInput,projectInput,descriptionInput].forEach(function(input){
                input.setCustomValidity("");
            });

            render();
        });
    }

    retryButton.addEventListener("click",loadTeam);

    loadTeam();
})();