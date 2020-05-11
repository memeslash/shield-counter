module.exports = function ShieldCounter(d) {

    const sa_id = [13100, 131130]; // 00 hard cast | 30 chain
    const spring_cancels = [251000, 251030, 210401, 210402, 260100] // 251xxx = wallop, 20200 = block, 210xxx = lockdown blow 260100 = backstep
    
    let counter = 0;
    let castingSA = false;
    let lastSkillSA = false;
    let bossResults = true;
    let quickResults = true;
    let boss = {};
    let tracking = true;
    let chatResults = true;
    let noticeResults = false;
    let bossStart;
    let bossEnd;
    let bossDuration;

    function dgMsg(message) {
         d.send('S_DUNGEON_EVENT_MESSAGE', 2, {
            type: 65,
            chat: false,
            channel: 0,
            message: message
         });
    }
     // Notice Results
    function noticeTotal(bossId) {
        d.setTimeout(function() {
            dgMsg(`Spring Attacks cast: ${boss[bossId]["totalSa"]}.`)
            dgMsg(`Max hits possible: ${4* boss[bossId]["totalSa"]}.`)
            dgMsg(`You landed: ${boss[bossId]["bossCounter"]} hits.`)
            if(tracking) {
            dgMsg(`Spring HPM: ${Math.round(boss[bossId]["bossCounter"] / bossDuration)}.`)
            }
        }, 100)
    }
    // Chat Results
     function chatTotal(bossId) {
         setTimeout(function() {
            d.command.message(`<font color="#e8dd13">Fight Results!</font>`)
            d.command.message(`Spring Attacks cast: ${boss[bossId]["totalSa"]}.`)
            d.command.message(`Max hits possible: ${boss[bossId]["totalSa"] * 4}.`)
            d.command.message(`You landed: ${boss[bossId]["bossCounter"]} hits.`)
            if(tracking) {
            d.command.message(`Spring HPM: ${Math.round(boss[bossId]["bossCounter"] / bossDuration)}.`)
            }
            delete boss[bossId]
        }, 100);
    }

    d.command.add('sa', {
        $none() { 
            d.command.message(`<font color="#e8dd13">Commands</font>`)
            d.command.message(`<font color="#26adf0">sa counter</font> : Enables/Disables quick results for every Spring Attack. Enabled by default.`)
            d.command.message(`<font color="#26adf0">sa boss</font> : Enables/Disables total results after killing a boss. Enabled by default.`)
            d.command.message(`<font color="#26adf0">sa notice</font> : Enables/Disables displaying results in a notice window. Disabled by default.`)
            d.command.message(`<font color="#26adf0">sa hpm</font> : Enables/Disables Spring Attack HPM tracking. Enabled by default.`);
        },
        help() {
            d.command.message(`<font color="#e8dd13">Commands</font>`)
            d.command.message(`<font color="#26adf0">sa counter</font> : Enables/Disables quick results for every Spring Attack. Enabled by default.`)
            d.command.message(`<font color="#26adf0">sa boss</font> : Enables/Disables total results after killing a boss. Enabled by default.`)
            d.command.message(`<font color="#26adf0">sa notice</font> : Enables/Disables displaying results in a notice window. Disabled by default.`)
            d.command.message(`<font color="#26adf0">sa hpm</font> : Enables/Disables Spring Attack HPM tracking. Enabled by default.`);
        },
        counter() {
            quickResults = !quickResults
            d.command.message(`Quick results are now ${quickResults? '<font color="#24bf2a">enabled</font>' : '<font color="#f71919">disabled</font>'}.`)
        },
        boss() {
            bossResults = !bossResults
            d.command.message(`Boss results are now ${bossResults? '<font color="#24bf2a">enabled</font>' : '<font color="#f71919">disabled</font>'}.`)
        },
        notice() {
            noticeResults = !noticeResults
            d.command.message(`Notice results ${noticeResults? '<font color="#24bf2a">enabled</font>' : '<font color="#f71919">disabled</font>'}.`)
        },
        hpm() {
            tracking = !tracking
            d.command.message(`Spring Attack HPM tracking ${tracking? '<font color="#24bf2a">enabled</font>' : '<font color="#f71919">disabled</font>'}.`)
        }
    });

    d.game.me.on('enter_combat', () => {
        if(d.game.me.inDungeon && tracking) {
            bossStart = Date.now()
            console.log(`bossStart: ${bossStart}`)
        }
    });

    d.game.me.on('leave_combat', () => {
        if(d.game.me.inDungeon && tracking) {
            bossEnd = Date.now()
            console.log(`bossEnd: ${bossEnd}`)
            bossDuration = (bossEnd - bossStart) / 60000
            console.log(`bossDuration: ${bossDuration}`)
        }
    });

    d.hook('S_BOSS_GAGE_INFO', 3, (e) => {
        if(!Object.keys(boss).includes(e.id.toString())) {
            boss[e.id.toString()] = { "totalSa": 0, "bossCounter": 0}
        }
        if(e.curHp == 0n && Object.keys(boss).includes(e.id.toString())) {
            if(bossResults && d.game.me.class == 'lancer') {
                setTimeout(function() {
                    if(noticeResults) {
                        noticeTotal(e.id.toString())
                        chatTotal(e.id.toString())
                    } else { 
                        chatTotal(e.id.toString()) 
                    }
                }, 2000)
            }
        }
    });
    
    d.hook('S_EACH_SKILL_RESULT', 14, (e) => {
        if(d.game.me.class == 'lancer') {
            if(sa_id.includes(e.skill.id) && d.game.me.is(e.source) && !lastSkillSA && Object.keys(boss).includes(e.target.toString())) {
                boss[e.target]['totalSa']++
            }
            if(sa_id.includes(e.skill.id) && d.game.me.is(e.source)) {
                if(Object.keys(boss).includes(e.target.toString())) {
                    boss[e.target]['bossCounter']++
                }
                counter++
                lastSkillSA = true;
                castingSA = true;
            } else if(!sa_id.includes(e.skill.id) && d.game.me.is(e.source)) {
                lastSkillSA = false;
                castingSA = false;
                counter = 0
            }
        }
    });

    d.hook('S_ACTION_STAGE', 9, (e) => {
        if(!quickResults) return;
        if(lastSkillSA && spring_cancels.includes(e.skill.id)) {
            d.setTimeout(function() {
                if(d.game.me.class == 'lancer') {
                    d.command.message(`Blocked after: ${counter} hits`)
                }
                counter = 0;
                lastSkillSA = false;
            }, 100);
        }
    });

    d.hook('C_PRESS_SKILL', 4, (e) => {
        if(lastSkillSA && e.skill.id == 20200) { 
            if(d.game.me.class == 'lancer') {
                d.command.message(`Blocked after: ${counter} hits`)
                counter = 0;
                lastSkillSA = false;
            }
        }
    });

    this.destructor = function () {
        d.game.me.removeAllListeners([`enter_combat`])
        d.game.me.removeAllListeners([`leave_combat`])
    }
};