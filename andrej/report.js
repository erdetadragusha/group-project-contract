// Screen 06 – Report Conflict (create) and editing an own report (update).
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");
    const editId=app.params.get("id");

    async function load(context){
        const sections=await app.request(
            database.from("contract_sections")
                .select("id,kind")
                .eq("contract_id",context.contract.id)
                .order("position",{ascending:true})
        );

        let existing=null;

        if(editId){
            existing=await app.request(
                database.from("conflicts")
                    .select("id,reporter_id,title,description,severity,status")
                    .eq("id",editId)
                    .maybeSingle()
            );

            if(!existing){
                throw new app.AppError("not_found");
            }

            if(existing.reporter_id!==context.user.id){
                throw new app.AppError("not_author");
            }

            if(existing.status==="resolved"){
                throw new app.AppError("already_resolved");
            }
        }

        return {sections:sections,existing:existing};
    }

    function render(context,data){
        const existing=data.existing;

        if(existing){
            const heading=document.querySelector("h1");

            heading.setAttribute("data-i18n","report.editTitle");
            heading.textContent=app.t("report.editTitle");
        }

        const title=app.field({
            label:"report.issueTitle",
            hint:"report.issueTitleHint",
            required:true,
            attributes:{type:"text",maxlength:"120",value:existing ? existing.title : ""}
        });
        const description=app.field({
            label:"report.description",
            hint:"report.descriptionHint",
            control:"textarea",
            required:true,
            attributes:{rows:"4",maxlength:"2000"}
        });
        const section=app.field({
            label:"report.relatedSection",
            control:"select"
        });

        description.control.value=existing ? existing.description : "";
        section.control.append(h("option",{value:"",i18n:"report.noSection"}));
        data.sections.forEach(function(item){
            section.control.append(
                h("option",{value:item.id,i18n:"sectionKind."+item.kind})
            );
        });

        let severity=existing ? existing.severity : "medium";

        const severityGroup=h("fieldset",{class:"card"},
            h("legend",{i18n:"report.groupSeverity"}),
            h("div",{class:"choices"},["low","medium","high"].map(function(level){
                const input=h("input",{
                    type:"radio",
                    name:"severity",
                    value:level,
                    checked:severity===level ? true : null
                });

                input.addEventListener("change",function(){
                    severity=level;
                });

                return h("label",{class:"choice"},
                    input,
                    h("span",null,
                        h("strong",{i18n:"severity."+level}),
                        h("span",{class:"muted small block",i18n:"report.severityHint."+level})
                    )
                );
            }))
        );

        const peopleError=h("p",{id:"people-error",class:"error-text",role:"alert",hidden:true});
        const people=context.members.map(function(member){
            return {
                id:member.user_id,
                input:h("input",{type:"checkbox",value:member.user_id}),
                name:member.full_name
            };
        });
        const peopleGroup=h("fieldset",{class:"card","aria-describedby":"people-error"},
            h("legend",{i18n:"report.groupWho"}),
            h("p",{class:"hint",i18n:"report.whoHint"}),
            people.map(function(person){
                return h("label",{class:"check-row"},
                    person.input,
                    h("span",{text:person.name})
                );
            }),
            peopleError
        );

        const formError=h("p",{class:"error-text",role:"alert",hidden:true});
        const submit=h("button",{
            type:"submit",
            class:"button",
            i18n:existing ? "actions.saveChanges" : "report.submit"
        });

        const form=h("form",{class:"form",novalidate:true},
            h("p",{class:"muted",i18n:"report.intro"}),
            h("fieldset",{class:"card"},
                h("legend",{i18n:"report.groupWhat"}),
                title.wrapper,
                description.wrapper,
                existing ? null : section.wrapper
            ),
            severityGroup,
            existing ? null : peopleGroup,
            formError,
            submit,
            h("a",{
                class:"button button-secondary",
                href:existing
                    ? app.url("conflict.html",{id:existing.id})
                    : app.url("conflicts.html"),
                i18n:"actions.cancel"
            })
        );

        form.addEventListener("submit",async function(event){
            event.preventDefault();

            let valid=app.checkLength(title,5,120);

            valid=app.checkLength(description,20,2000) && valid;

            const chosen=people.filter(function(person){
                return person.input.checked;
            }).map(function(person){
                return person.id;
            });

            if(!existing && chosen.length===0){
                peopleError.setAttribute("data-i18n","validation.choose_people");
                peopleError.textContent=app.t("validation.choose_people");
                peopleError.hidden=false;

                if(valid){
                    people[0].input.focus();
                }

                valid=false;
            }else{
                peopleError.hidden=true;
            }

            if(!valid){
                app.focusFirstError(form);
                return;
            }

            submit.disabled=true;
            formError.hidden=true;

            try{
                let id;

                if(existing){
                    const updated=await app.request(
                        database.from("conflicts")
                            .update({
                                title:title.control.value.trim(),
                                description:description.control.value.trim(),
                                severity:severity
                            })
                            .eq("id",existing.id)
                            .select("id")
                    );

                    if(!updated || updated.length===0){
                        throw new app.AppError("already_resolved");
                    }

                    id=existing.id;
                    app.toastOnNextPage("report.updated");
                }else{
                    id=await app.request(database.rpc("report_conflict",{
                        p_contract_id:context.contract.id,
                        p_title:title.control.value.trim(),
                        p_description:description.control.value.trim(),
                        p_severity:severity,
                        p_section_id:section.control.value || null,
                        p_participants:chosen
                    }));

                    app.toastOnNextPage("report.submitted");
                }

                window.location.href=app.url("conflict.html",{id:id});
            }catch(error){
                app.showFormError(formError,error.code);
                submit.disabled=false;
            }
        });

        app.fill(content,form);
    }

    app.start({load:load,render:render,rerenderOnLanguage:false});
})();
