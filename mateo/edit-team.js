(function(){
    const params=new URLSearchParams(window.location.search);
    const teamId=params.get("teamId");

    const form=document.querySelector("#edit-team-form");
    const teamName=document.querySelector("#edit-team-name");
    const projectName=document.querySelector("#edit-project-name");
    const description=document.querySelector("#edit-description");
    const message=document.querySelector("#edit-message");

    const saveButton=document.querySelector("#edit-save");
    const deleteButton=document.querySelector("#edit-delete");
    const retryButton=document.querySelector("#edit-retry");

    const fields=[teamName,projectName,description];

    let team=null;
    let ownerId=null;
    let busy=false;
    let started=false;
    let messageKey="editTeam.messages.loading";

    function validId(value){
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value || ""
        );
    }

    function render(){
        message.textContent=i18next.t(messageKey);

        form.hidden=!team;
        saveButton.disabled=busy || !team;
        deleteButton.disabled=busy || !team;

        retryButton.hidden=!!team;
        retryButton.disabled=busy;

        fields.forEach(function(field){
            field.disabled=busy;
        });
    }

    async function loadTeam(){
        if(busy){
            return;
        }

        busy=true;
        team=null;
        ownerId=null;
        messageKey="editTeam.messages.loading";
        render();

        try{
            if(!validId(teamId)){
                messageKey="editTeam.errors.missingTeam";
                return;
            }

            const {data:authData,error:authError}=
                await database.auth.getUser();

            if(authError || !authData.user){
                messageKey="editTeam.errors.loginRequired";
                return;
            }

            const {data,error}=await database
                .from("teams")
                .select("id,name,project_name,description,owner_id")
                .eq("id",teamId)
                .maybeSingle();

            if(error){
                messageKey="editTeam.errors.connection";
                return;
            }

            if(!data || data.owner_id!==authData.user.id){
                messageKey="editTeam.errors.ownerOnly";
                return;
            }

            team=data;
            ownerId=authData.user.id;

            teamName.value=team.name;
            projectName.value=team.project_name;
            description.value=team.description;

            messageKey="editTeam.messages.ready";

        }catch(error){
            messageKey="editTeam.errors.connection";
        }finally{
            busy=false;
            render();
        }
    }

    async function saveTeam(event){
        event.preventDefault();

        if(busy || !team){
            return;
        }

        const values={
            name:teamName.value.trim(),
            project_name:projectName.value.trim(),
            description:description.value.trim()
        };

        const emptyField=fields.find(function(field){
            return field.value.trim()==="";
        });

        if(emptyField){
            messageKey="editTeam.errors.required";
            render();

            emptyField.setAttribute("aria-invalid","true");
            emptyField.focus();
            return;
        }

        if(!form.reportValidity()){
            return;
        }

        busy=true;
        messageKey="editTeam.messages.saving";
        render();

        try{
            const {data,error}=await database
                .from("teams")
                .update(values)
                .eq("id",teamId)
                .eq("owner_id",ownerId)
                .select("id,name,project_name,description,owner_id")
                .single();

            if(error || !data){
                messageKey="editTeam.errors.save";
                return;
            }

            team=data;

            teamName.value=team.name;
            projectName.value=team.project_name;
            description.value=team.description;

            messageKey="editTeam.messages.saved";

        }catch(error){
            messageKey="editTeam.errors.save";
        }finally{
            busy=false;
            render();
        }
    }

    async function deleteTeam(){
        if(busy || !team){
            return;
        }

        const confirmed=window.confirm(
            i18next.t("editTeam.deleteConfirmation",{
                name:team.name
            })
        );

        if(!confirmed){
            return;
        }

        busy=true;
        messageKey="editTeam.messages.deleting";
        render();

        try{
            const {data,error}=await database
                .from("teams")
                .delete()
                .eq("id",teamId)
                .eq("owner_id",ownerId)
                .select("id");

            if(error || !Array.isArray(data) || data.length!==1){
                messageKey="editTeam.errors.delete";
                return;
            }

            window.location.replace("my-teams.html");

        }catch(error){
            messageKey="editTeam.errors.delete";
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

        fields.forEach(function(field){
            field.addEventListener("input",function(){
                field.setCustomValidity("");
                field.removeAttribute("aria-invalid");
            });

            field.addEventListener("invalid",function(){
                field.setCustomValidity(
                    i18next.t("editTeam.errors.required")
                );

                field.setAttribute("aria-invalid","true");
            });
        });

        form.addEventListener("submit",saveTeam);
        deleteButton.addEventListener("click",deleteTeam);
        retryButton.addEventListener("click",loadTeam);

        i18next.on("languageChanged",function(){
            fields.forEach(function(field){
                field.setCustomValidity("");
                field.removeAttribute("aria-invalid");
            });

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