// Screen 04 – Propose Contract Changes (create) and editing an own proposal
// (update). With ?id=... the form edits an existing proposal.
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");
    const editId=app.params.get("id");

    async function load(context){
        const sections=await app.request(
            database.from("contract_sections")
                .select("id,kind,body")
                .eq("contract_id",context.contract.id)
                .order("position",{ascending:true})
        );

        let existing=null;

        if(editId){
            existing=await app.request(
                database.from("change_requests")
                    .select("id,section_id,author_id,title,proposed_text,reason,status,voting_closes")
                    .eq("id",editId)
                    .maybeSingle()
            );

            if(!existing){
                throw new app.AppError("not_found");
            }

            const votes=await app.request(
                database.from("change_votes")
                    .select("user_id")
                    .eq("change_request_id",editId)
            );

            if(existing.author_id!==context.user.id){
                throw new app.AppError("not_author");
            }

            // Editing is locked once a teammate has voted, otherwise people
            // would have voted for a text that changed afterwards.
            if(existing.status!=="pending" || votes.some(function(vote){
                return vote.user_id!==context.user.id;
            })){
                throw new app.AppError("already_voted");
            }
        }

        return {sections:sections,existing:existing};
    }

    function render(context,data){
        const existing=data.existing;

        if(existing){
            const heading=document.querySelector("h1");

            heading.setAttribute("data-i18n","propose.editTitle");
            heading.textContent=app.t("propose.editTitle");
        }

        // Three small groups instead of one long form (Miller).
        const section=app.field({
            label:"propose.section",
            control:"select",
            required:true,
            attributes:{disabled:existing ? true : null}
        });

        section.control.append(h("option",{value:"",i18n:"propose.chooseSection"}));
        data.sections.forEach(function(item){
            section.control.append(
                h("option",{value:item.id,i18n:"sectionKind."+item.kind})
            );
        });
        section.control.value=existing
            ? existing.section_id
            : (app.params.get("section") || "");

        const currentText=h("p");
        const currentBox=h("div",{class:"quote",hidden:true},
            h("p",{class:"eyebrow",i18n:"propose.currentText"}),
            currentText
        );

        function showCurrentRule(){
            const chosen=data.sections.find(function(item){
                return item.id===section.control.value;
            });

            currentBox.hidden=!chosen;
            currentText.textContent=chosen ? chosen.body : "";
        }

        section.control.addEventListener("change",showCurrentRule);
        showCurrentRule();

        const title=app.field({
            label:"propose.changeTitle",
            hint:"propose.changeTitleHint",
            required:true,
            attributes:{type:"text",maxlength:"120",value:existing ? existing.title : ""}
        });
        const newText=app.field({
            label:"propose.newText",
            hint:"propose.newTextHint",
            control:"textarea",
            required:true,
            attributes:{rows:"4",maxlength:"1000"}
        });
        const reason=app.field({
            label:"propose.reason",
            hint:"propose.reasonHint",
            control:"textarea",
            required:true,
            attributes:{rows:"3",maxlength:"1000"}
        });
        const closes=app.field({
            label:"propose.closes",
            hint:"propose.closesHint",
            required:true,
            attributes:{
                type:"date",
                min:app.today(),
                value:existing ? existing.voting_closes : app.addDays(app.today(),3)
            }
        });

        newText.control.value=existing ? existing.proposed_text : "";
        reason.control.value=existing ? existing.reason : "";

        // External API: warn when the voting deadline is a public holiday.
        const holidayNote=h("p",{class:"small","aria-live":"polite"});

        async function checkHoliday(){
            const date=closes.control.value;

            holidayNote.className="small";
            holidayNote.textContent="";
            holidayNote.removeAttribute("data-i18n");

            if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){
                return;
            }

            const result=await app.holidaysBetween(
                context.contract.country_code,date,date
            );

            if(closes.control.value!==date){
                return; // The date changed while we were waiting.
            }

            if(result.status==="error"){
                holidayNote.className="small muted";
                holidayNote.setAttribute("data-i18n","propose.holidayUnavailable");
                holidayNote.textContent=app.t("propose.holidayUnavailable");
            }else if(result.items.length>0){
                holidayNote.className="banner banner-warn";
                holidayNote.textContent=app.t("propose.holidayWarning",{
                    date:app.formatDate(date),
                    name:result.items[0].localName
                });
            }
        }

        closes.control.addEventListener("change",checkHoliday);
        checkHoliday();

        const formError=h("p",{class:"error-text",role:"alert",hidden:true});
        const submit=h("button",{
            type:"submit",
            class:"button",
            i18n:existing ? "actions.saveChanges" : "propose.submit"
        });

        const form=h("form",{class:"form",novalidate:true},
            h("fieldset",{class:"card"},
                h("legend",{i18n:"propose.groupWhat"}),
                section.wrapper,currentBox,title.wrapper
            ),
            h("fieldset",{class:"card"},
                h("legend",{i18n:"propose.groupWhy"}),
                newText.wrapper,reason.wrapper
            ),
            h("fieldset",{class:"card"},
                h("legend",{i18n:"propose.groupVoting"}),
                closes.wrapper,holidayNote
            ),
            formError,
            submit,
            h("a",{
                class:"button button-secondary",
                href:existing
                    ? app.url("voting.html",{id:existing.id})
                    : app.url("changes.html"),
                i18n:"actions.cancel"
            })
        );

        function validate(){
            let valid=true;

            if(!section.control.value){
                section.setError("required");
                valid=false;
            }else{
                section.setError(null);
            }

            valid=app.checkLength(title,5,120) && valid;
            valid=app.checkLength(newText,10,1000) && valid;
            valid=app.checkLength(reason,10,1000) && valid;

            if(!closes.control.value){
                closes.setError("required");
                valid=false;
            }else if(closes.control.value<app.today()){
                closes.setError("date_in_past");
                valid=false;
            }else{
                closes.setError(null);
            }

            return valid;
        }

        form.addEventListener("submit",async function(event){
            event.preventDefault();

            if(!validate()){
                app.focusFirstError(form);
                return;
            }

            submit.disabled=true;
            formError.hidden=true;

            const values={
                title:title.control.value.trim(),
                proposed_text:newText.control.value.trim(),
                reason:reason.control.value.trim(),
                voting_closes:closes.control.value
            };

            try{
                let id;

                if(existing){
                    const updated=await app.request(
                        database.from("change_requests")
                            .update(values)
                            .eq("id",existing.id)
                            .select("id")
                    );

                    // No row comes back when a teammate voted in the meantime.
                    if(!updated || updated.length===0){
                        throw new app.AppError("already_voted");
                    }

                    id=existing.id;
                    app.toastOnNextPage("propose.updated");
                }else{
                    const created=await app.request(
                        database.from("change_requests")
                            .insert(Object.assign({
                                contract_id:context.contract.id,
                                section_id:section.control.value
                            },values))
                            .select("id")
                            .single()
                    );

                    id=created.id;
                    app.toastOnNextPage("propose.submitted");
                }

                window.location.href=app.url("voting.html",{id:id});
            }catch(error){
                app.showFormError(formError,error.code);
                submit.disabled=false;
            }
        });

        app.fill(content,form);
    }

    // The form is built once; a language change only re-translates its labels.
    app.start({load:load,render:render,rerenderOnLanguage:false});
})();
