// Screen 07 – Conflict Details: the report, the people involved, updates,
// proposed resolutions, and withdrawing an own report (delete).
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");
    const footer=document.querySelector("#footer");
    const conflictId=app.params.get("id");

    let typedNote="";

    function load(){
        return app.loadConflict(conflictId);
    }

    function render(context,data){
        const conflict=data.conflict;
        const resolved=conflict.status==="resolved";
        const mine=conflict.reporter_id===context.user.id;

        // Main action in the thumb zone: go to the resolution screen.
        footer.hidden=resolved;
        app.fill(footer,resolved ? null : h("a",{
            class:"button",
            href:app.url("resolution.html",{id:conflict.id}),
            i18n:data.open ? "conflict.reviewResolution" : "conflict.proposeResolution"
        }));

        const note=h("textarea",{id:"conflict-note",rows:"2",maxlength:"1000","aria-describedby":"note-error"});
        const noteError=h("p",{id:"note-error",class:"error-text",role:"alert",hidden:true});
        const noteButton=h("button",{type:"submit",class:"button button-secondary",i18n:"conflict.postNote"});
        const noteForm=h("form",{novalidate:true},
            h("label",{for:"conflict-note",i18n:"conflict.addNote"}),
            note,noteError,noteButton
        );

        note.value=typedNote;
        note.addEventListener("input",function(){
            typedNote=note.value;
        });

        noteForm.addEventListener("submit",async function(event){
            event.preventDefault();

            if(note.value.trim().length<2){
                noteError.setAttribute("data-i18n","validation.required");
                noteError.textContent=app.t("validation.required");
                noteError.hidden=false;
                note.setAttribute("aria-invalid","true");
                note.focus();
                return;
            }

            noteButton.disabled=true;

            try{
                await app.request(
                    database.from("conflict_updates").insert({
                        conflict_id:conflict.id,
                        body:note.value.trim()
                    })
                );

                typedNote="";
                app.toast("conflict.noteAdded");
                app.reload();
            }catch(error){
                app.showFormError(noteError,error.code);
                noteButton.disabled=false;
            }
        });

        app.fill(content,
            h("section",{class:"card","aria-labelledby":"conflict-title"},
                h("div",{class:"badges"},
                    app.badge(conflict.status),
                    app.badge(conflict.severity,"severity")
                ),
                h("h2",{id:"conflict-title",class:"lead",text:conflict.title}),
                h("dl",{class:"kv"},
                    h("div",null,
                        h("dt",{i18n:"conflict.reportedBy"}),
                        h("dd",{text:app.memberName(conflict.reporter_id)})
                    ),
                    h("div",null,
                        h("dt",{i18n:"conflict.dateReported"}),
                        h("dd",{text:app.formatDateTime(conflict.created_at)})
                    ),
                    data.section ? h("div",null,
                        h("dt",{i18n:"conflict.relatedSection"}),
                        h("dd",{i18n:"sectionKind."+data.section.kind})
                    ) : null
                )
            ),

            h("section",{class:"card","aria-labelledby":"description-heading"},
                h("h2",{id:"description-heading",i18n:"conflict.description"}),
                h("p",{text:conflict.description}),
                h("h3",{i18n:"conflict.involved"}),
                h("ul",{class:"chips"},data.participants.map(function(userId){
                    return h("li",{class:"chip",text:app.memberName(userId)});
                }))
            ),

            h("section",{class:"card","aria-labelledby":"resolution-heading"},
                h("h2",{id:"resolution-heading",i18n:"conflict.resolutions"}),
                data.resolutions.length===0
                    ? app.emptyState("conflict.noResolution","conflict.noResolutionHint")
                    : h("ul",{class:"list compact"},data.resolutions.map(function(item){
                        return h("li",{class:"timeline-item"},
                            app.badge(item.status),
                            h("p",{text:item.proposal}),
                            h("p",{class:"muted small",i18n:["conflict.proposedBy",{
                                name:app.memberName(item.proposer_id),
                                date:app.formatDateTime(item.created_at)
                            }]})
                        );
                    }))
            ),

            h("section",{class:"card","aria-labelledby":"updates-heading"},
                h("h2",{id:"updates-heading",i18n:"conflict.updates"}),
                data.updates.length===0
                    ? h("p",{class:"muted",i18n:"conflict.noUpdates"})
                    : h("ol",{class:"list compact"},data.updates.map(function(item){
                        return h("li",{class:"timeline-item"},
                            h("p",{text:item.body}),
                            h("p",{class:"muted small",text:
                                app.memberName(item.author_id)+" · "+
                                app.formatDateTime(item.created_at)})
                        );
                    })),
                resolved ? null : noteForm
            ),

            mine && !resolved ? h("section",{class:"card card-quiet","aria-labelledby":"own-heading"},
                h("h2",{id:"own-heading",class:"eyebrow",i18n:"conflict.yourReport"}),
                h("a",{
                    class:"button button-secondary",
                    href:app.url("report.html",{id:conflict.id}),
                    i18n:"actions.edit"
                }),
                h("button",{
                    type:"button",
                    class:"button-danger-text",
                    i18n:"conflict.withdraw",
                    onclick:async function(){
                        const confirmed=await app.confirmAction(
                            "conflict.withdrawTitle",
                            "conflict.withdrawBody",
                            null,
                            "conflict.withdrawConfirm"
                        );

                        if(!confirmed){
                            return;
                        }

                        try{
                            const removed=await app.request(
                                database.from("conflicts")
                                    .delete()
                                    .eq("id",conflict.id)
                                    .select("id")
                            );

                            if(!removed || removed.length===0){
                                throw new app.AppError("already_resolved");
                            }

                            app.toastOnNextPage("conflict.withdrawn");
                            window.location.href=app.url("conflicts.html");
                        }catch(error){
                            app.toast("errors."+error.code);
                        }
                    }
                })
            ) : null
        );
    }

    app.start({load:load,render:render});
})();
