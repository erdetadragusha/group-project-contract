// Screen 05 – Approval Voting: one change request, the team's votes,
// the user's own vote, and withdrawing an own proposal (delete).
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");
    const requestId=app.params.get("id");

    let selectedChoice=null;
    let typedComment=null;

    async function load(){
        const item=await app.request(
            database.from("change_requests")
                .select("id,contract_id,section_id,author_id,title,proposed_text,reason,status,voting_closes,created_at")
                .eq("id",requestId || "00000000-0000-0000-0000-000000000000")
                .maybeSingle()
        );

        if(!item){
            throw new app.AppError("not_found");
        }

        const section=await app.request(
            database.from("contract_sections")
                .select("id,kind,body")
                .eq("id",item.section_id)
                .maybeSingle()
        );

        const votes=await app.request(
            database.from("change_votes")
                .select("user_id,choice,comment,created_at")
                .eq("change_request_id",item.id)
                .order("created_at",{ascending:true})
        );

        selectedChoice=null;
        typedComment=null;

        return {item:item,section:section,votes:votes};
    }

    function render(context,data){
        const item=data.item;
        const pending=item.status==="pending";
        const myVote=data.votes.find(function(vote){
            return vote.user_id===context.user.id;
        });
        const count={approve:0,reject:0,abstain:0};

        data.votes.forEach(function(vote){
            count[vote.choice]+=1;
        });

        const cast=data.votes.length;
        const total=context.members.length;
        const isAuthor=item.author_id===context.user.id;
        const othersVoted=data.votes.some(function(vote){
            return vote.user_id!==item.author_id;
        });
        const left=app.daysUntil(item.voting_closes);

        if(selectedChoice===null){
            selectedChoice=myVote ? myVote.choice : "";
        }

        if(typedComment===null){
            typedComment=myVote && myVote.comment ? myVote.comment : "";
        }

        const parts=[
            h("section",{class:"card","aria-labelledby":"request-title"},
                h("div",{class:"badges"},app.badge(item.status)),
                h("h2",{id:"request-title",class:"lead",text:item.title}),
                h("dl",{class:"kv"},
                    h("div",null,
                        h("dt",{i18n:"voting.proposedBy"}),
                        h("dd",{text:app.memberName(item.author_id)})
                    ),
                    data.section ? h("div",null,
                        h("dt",{i18n:"voting.section"}),
                        h("dd",{i18n:"sectionKind."+data.section.kind})
                    ) : null,
                    h("div",null,
                        h("dt",{i18n:"voting.closes"}),
                        h("dd",null,
                            app.formatDate(item.voting_closes),
                            pending ? " · " : null,
                            pending ? h("span",{i18n:left>=0
                                ? ["changes.closesIn",{count:left}]
                                : "changes.closed"}) : null
                        )
                    )
                )
            ),

            h("section",{class:"card","aria-labelledby":"diff-heading"},
                h("h2",{id:"diff-heading",i18n:"voting.whatChanges"}),
                pending && data.section ? h("div",{class:"quote quote-old"},
                    h("p",{class:"eyebrow",i18n:"voting.now"}),
                    h("p",{text:data.section.body})
                ) : null,
                h("div",{class:"quote quote-new"},
                    h("p",{class:"eyebrow",i18n:"voting.proposed"}),
                    h("p",{text:item.proposed_text})
                ),
                h("h3",{i18n:"voting.reason"}),
                h("p",{text:item.reason})
            ),

            h("section",{class:"card","aria-labelledby":"votes-heading"},
                h("div",{class:"row-between"},
                    h("h2",{id:"votes-heading",i18n:"voting.teamVotes"}),
                    h("span",{class:"muted",i18n:["changes.votesProgress",{cast:cast,total:total}]})
                ),
                h("progress",{class:"progress",max:String(total),value:String(cast),ariaI18n:"voting.teamVotes"}),
                h("p",{class:"muted small",i18n:["voting.tally",count]}),
                pending && total-cast>0
                    ? h("p",{class:"muted small",i18n:["voting.remaining",{count:total-cast}]})
                    : null,
                h("ul",{class:"list compact"},context.members.map(function(member){
                    const vote=data.votes.find(function(entry){
                        return entry.user_id===member.user_id;
                    });

                    return h("li",{class:"vote-row"},
                        h("span",{text:member.full_name}),
                        h("span",{class:"vote-choice",i18n:vote
                            ? "voting.choice."+vote.choice
                            : "voting.notVoted"}),
                        vote && vote.comment
                            ? h("span",{class:"muted small vote-comment",text:vote.comment})
                            : null
                    );
                }))
            )
        ];

        if(pending){
            const formError=h("p",{class:"error-text",role:"alert",hidden:true});
            const comment=h("textarea",{id:"vote-comment",rows:"2",maxlength:"500"});
            const submit=h("button",{type:"submit",class:"button",i18n:"voting.submit"});

            comment.value=typedComment;
            comment.addEventListener("input",function(){
                typedComment=comment.value;
            });

            const form=h("form",{class:"card",novalidate:true},
                h("fieldset",null,
                    h("legend",{i18n:myVote ? "voting.changeVote" : "voting.castVote"}),
                    h("div",{class:"choices"},
                        ["approve","reject","abstain"].map(function(choice){
                            const input=h("input",{
                                type:"radio",
                                name:"choice",
                                value:choice,
                                checked:selectedChoice===choice ? true : null
                            });

                            input.addEventListener("change",function(){
                                selectedChoice=choice;
                                formError.hidden=true;
                            });

                            return h("label",{class:"choice"},
                                input,
                                h("span",{i18n:"voting.choice."+choice})
                            );
                        })
                    )
                ),
                h("label",{for:"vote-comment"},
                    h("span",{i18n:"voting.comment"})," ",
                    h("span",{class:"field-note",i18n:"form.optional"})
                ),
                comment,
                formError,
                submit
            );

            form.addEventListener("submit",async function(event){
                event.preventDefault();

                if(!selectedChoice){
                    app.showFormError(formError,"choose_option");
                    form.querySelector("input[type='radio']").focus();
                    return;
                }

                submit.disabled=true;

                try{
                    const status=await app.request(database.rpc("cast_vote",{
                        p_change_id:item.id,
                        p_choice:selectedChoice,
                        p_comment:comment.value
                    }));

                    app.toast(status==="pending"
                        ? "voting.saved"
                        : "voting.final."+status);
                    app.reload();
                }catch(error){
                    app.showFormError(formError,error.code);
                    submit.disabled=false;
                }
            });

            parts.push(form);
        }else{
            parts.push(h("p",{class:"banner",i18n:"voting.final."+item.status}));
        }

        if(isAuthor && pending){
            // The destructive action is small, last on the page and asks for
            // confirmation, so it is hard to hit by mistake (Fitts).
            parts.push(h("section",{class:"card card-quiet","aria-labelledby":"own-heading"},
                h("h2",{id:"own-heading",class:"eyebrow",i18n:"voting.yourProposal"}),
                othersVoted
                    ? h("p",{class:"muted small",i18n:"voting.cannotEdit"})
                    : h("a",{
                        class:"button button-secondary",
                        href:app.url("propose.html",{id:item.id}),
                        i18n:"actions.edit"
                    }),
                h("button",{
                    type:"button",
                    class:"button-danger-text",
                    i18n:"voting.withdraw",
                    onclick:async function(){
                        const confirmed=await app.confirmAction(
                            "voting.withdrawTitle",
                            "voting.withdrawBody",
                            {count:cast},
                            "voting.withdrawConfirm"
                        );

                        if(!confirmed){
                            return;
                        }

                        try{
                            const removed=await app.request(
                                database.from("change_requests")
                                    .delete()
                                    .eq("id",item.id)
                                    .select("id")
                            );

                            if(!removed || removed.length===0){
                                throw new app.AppError("not_pending");
                            }

                            app.toastOnNextPage("voting.withdrawn");
                            window.location.href=app.url("changes.html");
                        }catch(error){
                            app.toast("errors."+error.code);
                        }
                    }
                })
            ));
        }

        parts.push(h("p",{class:"muted small",i18n:["voting.created",{
            date:app.formatDateTime(item.created_at)
        }]}));

        app.fill(content,parts);
    }

    app.start({load:load,render:render});
})();
