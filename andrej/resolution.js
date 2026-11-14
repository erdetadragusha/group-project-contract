// Screen 08 – Resolution Proposal: suggest a solution, or accept / reject
// the one that is open. Only the people involved in the conflict respond.
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");
    const conflictId=app.params.get("id");

    let writing=false;
    let typedProposal="";

    document.querySelector("#back-link").href=
        app.url("conflict.html",{id:conflictId || ""});

    function load(){
        return app.loadConflict(conflictId);
    }

    function render(context,data){
        const conflict=data.conflict;
        const open=data.open;

        if(conflict.status==="resolved"){
            app.fill(content,
                h("div",{class:"card"},
                    app.badge("resolved"),
                    h("p",{i18n:"resolution.alreadyResolved"}),
                    h("a",{
                        class:"button button-secondary",
                        href:app.url("history.html"),
                        i18n:"resolution.seeHistory"
                    })
                )
            );
            return;
        }

        const parts=[
            h("section",{class:"card","aria-labelledby":"issue-title"},
                h("p",{class:"eyebrow",i18n:"resolution.forConflict"}),
                h("h2",{id:"issue-title",class:"lead",text:conflict.title}),
                h("p",{class:"muted",text:conflict.description})
            )
        ];

        if(open && !writing){
            const responses=data.responses.filter(function(item){
                return item.resolution_id===open.id;
            });
            const accepted=responses.filter(function(item){
                return item.response==="accept";
            }).length;
            const involved=data.participants.includes(context.user.id);
            const comment=h("textarea",{id:"response-comment",rows:"2",maxlength:"500"});
            const error=h("p",{class:"error-text",role:"alert",hidden:true});

            async function respond(accept){
                try{
                    const status=await app.request(
                        database.rpc("respond_to_resolution",{
                            p_resolution_id:open.id,
                            p_accept:accept,
                            p_comment:comment.value
                        })
                    );

                    app.toast("resolution.result."+status);
                    app.reload();
                }catch(failure){
                    app.showFormError(error,failure.code);
                }
            }

            parts.push(h("section",{class:"card","aria-labelledby":"current-heading"},
                h("div",{class:"row-between"},
                    h("h2",{id:"current-heading",i18n:"resolution.current"}),
                    app.badge(open.status)
                ),
                h("p",{class:"quote quote-new",text:open.proposal}),
                h("p",{class:"muted small",i18n:["conflict.proposedBy",{
                    name:app.memberName(open.proposer_id),
                    date:app.formatDateTime(open.created_at)
                }]}),
                h("p",{class:"small",i18n:["resolution.acceptProgress",{
                    count:accepted,
                    total:data.participants.length
                }]}),
                h("ul",{class:"list compact"},data.participants.map(function(userId){
                    const answer=responses.find(function(item){
                        return item.user_id===userId;
                    });

                    return h("li",{class:"vote-row"},
                        h("span",{text:app.memberName(userId)}),
                        h("span",{class:"vote-choice",i18n:"resolution.response."+
                            (answer ? answer.response : "waiting")})
                    );
                })),
                involved ? h("div",{class:"form"},
                    h("label",{for:"response-comment"},
                        h("span",{i18n:"resolution.comment"})," ",
                        h("span",{class:"field-note",i18n:"form.optional"})
                    ),
                    comment,
                    error,
                    h("button",{type:"button",class:"button",i18n:"resolution.accept",onclick:function(){
                        respond(true);
                    }}),
                    h("button",{type:"button",class:"button button-secondary",i18n:"resolution.reject",onclick:function(){
                        respond(false);
                    }})
                ) : h("p",{class:"banner",i18n:"resolution.notParticipant"}),
                h("button",{type:"button",class:"button-link",i18n:"resolution.proposeDifferent",onclick:function(){
                    writing=true;
                    render(context,data);
                }})
            ));
        }else{
            const proposal=app.field({
                label:"resolution.proposal",
                hint:"resolution.proposalHint",
                control:"textarea",
                required:true,
                attributes:{rows:"4",maxlength:"1000"}
            });
            const formError=h("p",{class:"error-text",role:"alert",hidden:true});
            const submit=h("button",{type:"submit",class:"button",i18n:"resolution.submit"});

            proposal.control.value=typedProposal;
            proposal.control.addEventListener("input",function(){
                typedProposal=proposal.control.value;
            });

            const form=h("form",{class:"card form",novalidate:true},
                h("h2",{i18n:"resolution.newTitle"}),
                proposal.wrapper,
                open ? h("p",{class:"muted small",i18n:"resolution.replacesCurrent"}) : null,
                formError,
                submit,
                open ? h("button",{type:"button",class:"button button-secondary",i18n:"actions.cancel",onclick:function(){
                    writing=false;
                    render(context,data);
                }}) : null
            );

            form.addEventListener("submit",async function(event){
                event.preventDefault();

                if(!app.checkLength(proposal,10,1000)){
                    app.focusFirstError(form);
                    return;
                }

                submit.disabled=true;

                try{
                    await app.request(database.rpc("propose_resolution",{
                        p_conflict_id:conflict.id,
                        p_proposal:proposal.control.value.trim()
                    }));

                    writing=false;
                    typedProposal="";
                    app.toast("resolution.proposed");
                    app.reload();
                }catch(error){
                    app.showFormError(formError,error.code);
                    submit.disabled=false;
                }
            });

            parts.push(form);
        }

        app.fill(content,parts);
    }

    app.start({load:load,render:render});
})();
