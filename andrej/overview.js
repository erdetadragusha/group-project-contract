// Screen 01 – Active Contract Overview.
// When the team has no contract yet, the same page offers to create it.
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");
    const footer=document.querySelector("#footer");

    const KINDS=["communication","roles","deadlines","quality","meetings","conflicts"];
    const COUNTRIES=["HR","AL","XK","BA","SI","RS","ME","MK","AT","DE","IT","GB","US"];

    async function load(context){
        if(!context.contract){
            return {noContract:true};
        }

        const contractId=context.contract.id;

        const sections=await app.request(
            database.from("contract_sections")
                .select("id,kind,body,status")
                .eq("contract_id",contractId)
                .order("position",{ascending:true})
        );

        const pending=await app.request(
            database.from("change_requests")
                .select("id,title,voting_closes,created_at")
                .eq("contract_id",contractId)
                .eq("status","pending")
                .order("created_at",{ascending:false})
        );

        let votes=[];

        if(pending.length>0){
            votes=await app.request(
                database.from("change_votes")
                    .select("change_request_id,user_id")
                    .in("change_request_id",pending.map(function(item){
                        return item.id;
                    }))
            );
        }

        const conflicts=await app.request(
            database.from("conflicts")
                .select("id,title,severity,status,created_at")
                .eq("contract_id",contractId)
                .neq("status","resolved")
                .order("created_at",{ascending:false})
        );

        return {sections:sections,pending:pending,votes:votes,conflicts:conflicts};
    }

    // Uses the answers saved by the preferences flow as a starting text.
    function savedPreference(key){
        try{
            const value=JSON.parse(localStorage.getItem(key) || "null");

            if(Array.isArray(value) && value.length>0){
                return new Intl.ListFormat(app.language(),{
                    style:"long",
                    type:"conjunction"
                }).format(value.map(String));
            }
        }catch(error){
            // No saved answer; the default text is used.
        }

        return "";
    }

    function renderSetup(context){
        if(document.querySelector("#setup-form")){
            return; // Keep what the user has already typed.
        }

        footer.hidden=true;

        const fields=KINDS.map(function(kind){
            const item=app.field({
                label:"sectionKind."+kind,
                control:"textarea",
                required:true,
                attributes:{rows:"3",maxlength:"1000"}
            });
            const saved={
                communication:savedPreference("communicationPreferences"),
                roles:savedPreference("preferredRoles"),
                quality:savedPreference("qualityExpectations")
            }[kind];

            item.control.value=app.t("setup.default."+kind)+
                (saved ? " ("+saved+")" : "");
            item.kind=kind;
            return item;
        });

        const regionNames=new Intl.DisplayNames(app.language(),{type:"region"});
        const country=app.field({
            label:"setup.country",
            hint:"setup.countryHint",
            control:"select",
            required:true
        });

        COUNTRIES.forEach(function(code){
            country.control.append(
                h("option",{value:code,text:regionNames.of(code) || code})
            );
        });

        const formError=h("p",{class:"error-text",role:"alert",hidden:true});
        const submit=h("button",{
            type:"submit",
            class:"button",
            i18n:"setup.submit"
        });

        const form=h("form",{id:"setup-form",class:"form",novalidate:true},
            h("div",{class:"card"},
                h("h2",{i18n:"setup.heading"}),
                h("p",{class:"muted",i18n:["setup.intro",{team:context.team.name}]})
            ),
            h("fieldset",{class:"card"},
                h("legend",{i18n:"setup.rules"}),
                fields.map(function(item){
                    return item.wrapper;
                })
            ),
            h("fieldset",{class:"card"},
                h("legend",{i18n:"setup.where"}),
                country.wrapper
            ),
            formError,
            submit
        );

        form.addEventListener("submit",async function(event){
            event.preventDefault();

            const valid=fields.map(function(item){
                return app.checkLength(item,10,1000);
            }).every(Boolean);

            if(!valid){
                app.focusFirstError(form);
                return;
            }

            submit.disabled=true;
            formError.hidden=true;

            try{
                await app.request(database.rpc("create_contract",{
                    p_team_id:context.teamId,
                    p_sections:fields.map(function(item){
                        return {kind:item.kind,body:item.control.value.trim()};
                    }),
                    p_country_code:country.control.value
                }));

                form.remove();
                app.toast("setup.created");
                app.reload();
            }catch(error){
                app.showFormError(formError,error.code);
                submit.disabled=false;
            }
        });

        app.fill(content,form);
    }

    function render(context,data){
        if(data.noContract){
            renderSetup(context);
            return;
        }

        footer.hidden=false;

        const contract=context.contract;
        const votedIds=data.votes.filter(function(vote){
            return vote.user_id===context.user.id;
        }).map(function(vote){
            return vote.change_request_id;
        });
        const missing=data.pending.filter(function(item){
            return !votedIds.includes(item.id);
        }).length;
        const keyRules=data.sections.filter(function(section){
            return ["communication","deadlines","quality"].includes(section.kind);
        });

        app.fill(content,
            h("section",{class:"card","aria-labelledby":"status-heading"},
                h("div",{class:"row-between"},
                    h("h2",{id:"status-heading",class:"eyebrow",i18n:"overview.contractStatus"}),
                    app.badge(contract.status)
                ),
                h("p",{class:"lead",text:context.team.name+" · "+context.team.project_name}),
                h("p",{class:"muted",i18n:["overview.versionSince",{
                    version:contract.version,
                    date:app.formatDate(contract.effective_from)
                }]}),
                h("a",{class:"link-row",href:app.url("status.html"),i18n:"overview.seeStatus"})
            ),

            h("section",{class:"card","aria-labelledby":"rules-heading"},
                h("h2",{id:"rules-heading",i18n:"overview.keyRules"}),
                h("dl",{class:"kv"},keyRules.map(function(section){
                    return h("div",null,
                        h("dt",{i18n:"sectionKind."+section.kind}),
                        h("dd",{text:section.body})
                    );
                }))
            ),

            h("section",{class:"card","aria-labelledby":"pending-heading"},
                h("div",{class:"row-between"},
                    h("h2",{id:"pending-heading",i18n:["overview.pendingChanges",{count:data.pending.length}]}),
                    missing>0
                        ? h("span",{class:"badge badge-warn"},
                            h("span",{class:"badge-shape","aria-hidden":"true"}),
                            h("span",{i18n:["overview.yourVoteNeeded",{count:missing}]})
                        )
                        : null
                ),
                data.pending.length===0
                    ? app.emptyState("overview.noPending","overview.noPendingHint")
                    : h("ul",{class:"list"},data.pending.map(function(item){
                        const left=app.daysUntil(item.voting_closes);

                        return h("li",null,
                            h("a",{class:"list-item",href:app.url("voting.html",{id:item.id})},
                                h("span",{class:"item-title",text:item.title}),
                                h("span",{class:"muted small",i18n:left>=0
                                    ? ["changes.closesIn",{count:left}]
                                    : "changes.closed"}),
                                h("span",{class:"muted small",i18n:votedIds.includes(item.id)
                                    ? "changes.youVoted"
                                    : "changes.notVotedYet"})
                            )
                        );
                    }))
            ),

            h("section",{class:"card","aria-labelledby":"conflicts-heading"},
                h("h2",{id:"conflicts-heading",i18n:["overview.unresolvedConflicts",{count:data.conflicts.length}]}),
                data.conflicts.length===0
                    ? app.emptyState("overview.noConflicts")
                    : h("ul",{class:"list"},data.conflicts.map(function(item){
                        return h("li",null,
                            h("a",{class:"list-item",href:app.url("conflict.html",{id:item.id})},
                                h("span",{class:"item-title",text:item.title}),
                                h("span",{class:"badges"},
                                    app.badge(item.status),
                                    app.badge(item.severity,"severity")
                                )
                            )
                        );
                    }))
            ),

            h("a",{class:"link-row",href:"../mateo/my-teams.html",i18n:"overview.myTeams"})
        );
    }

    app.start({needsContract:false,load:load,render:render});
})();
