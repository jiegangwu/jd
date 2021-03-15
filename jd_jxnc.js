/*
特别声明：
本脚本搬运自 https://github.com/whyour/hundun/blob/master/quanx/jx_nc.js
感谢 @whyour 大佬

无需京喜token,只需京东cookie即可.

京喜农场:脚本更新地址 https://gitee.com/lxk0301/jd_scripts/raw/master/jd_jxnc.js
更新时间：2021-03-11
活动入口：京喜APP我的-京喜农场
东东农场活动链接：https://wqsh.jd.com/sns/201912/12/jxnc/detail.html?ptag=7155.9.32&smp=b47f4790d7b2a024e75279f55f6249b9&active=jdnc_1_chelizi1205_2
已支持IOS,Node.js支持N个京东账号
理论上脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
助力码shareCode请先手动运行脚本查看打印可看到

hostname = wq.jd.com

==========================Quantumultx=========================
[task_local]
0 9,12,18 * * * https://gitee.com/lxk0301/jd_scripts/raw/master/jd_jxnc.js, tag=京喜农场, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jxnc.png, enabled=true
=========================Loon=============================
[Script]
cron "0 9,12,18 * * *" script-path=https://gitee.com/lxk0301/jd_scripts/raw/master/jd_jxnc.js,tag=京喜农场

=========================Surge============================
京喜农场 = type=cron,cronexp="0 9,12,18 * * *",timeout=3600,script-path=https://gitee.com/lxk0301/jd_scripts/raw/master/jd_jxnc.js

=========================小火箭===========================
京喜农场 = type=cron,script-path=https://gitee.com/lxk0301/jd_scripts/raw/master/jd_jxnc.js, cronexpr="0 9,12,18 * * *", timeout=3600, enable=true
*/

const $ = new Env('京喜农场');
let notify = ''; // nodejs 发送通知脚本
let notifyLevel = $.isNode() ? process.env.JXNC_NOTIFY_LEVEL || 1 : 1; // 通知级别 0=只通知成熟;1=本次获得水滴>0;2=任务执行;3=任务执行+未种植种子;
let notifyBool = true; // 代码内部使用，控制是否通知
let cookieArr = []; // 用户 cookie 数组
let currentCookie = ''; // 当前用户 cookie
let tokenNull = {'farm_jstoken': '', 'phoneid': '', 'timestamp': ''}; // 内置一份空的 token
let tokenArr = []; // 用户 token 数组
let currentToken = {}; // 当前用户 token
let shareCode = ''; // 内置助力码
let jxncShareCodeArr = []; // 用户 助力码 数组
let currentShareCode = []; // 当前用户 要助力的助力码
const openUrl = `openjd://virtual?params=${encodeURIComponent('{ "category": "jump", "des": "m", "url": "https://wqsh.jd.com/sns/201912/12/jxnc/detail.html?ptag=7155.9.32&smp=b47f4790d7b2a024e75279f55f6249b9&active=jdnc_1_chelizi1205_2"}',)}`; // 打开京喜农场
let subTitle = '', message = '', option = {'open-url': openUrl}; // 消息副标题，消息正文，消息扩展参数
const JXNC_API_HOST = 'https://wq.jd.com/';
let allMessage = '';
$.detail = []; // 今日明细列表
$.helpTask = null;
$.allTask = []; // 任务列表
$.info = {}; // 用户信息
$.answer = 3;
$.drip = 0;
$.maxHelpNum = $.isNode() ? 8 : 4; // 随机助力最大执行次数
$.helpNum = 0; // 当前账号 随机助力次数
let assistUserShareCode = 0; // 随机助力用户 share code

!(async () => {
    await requireConfig();
    if (process.env.JXNC_FORBID_ACCOUNT) process.env.JXNC_FORBID_ACCOUNT.split('&').map((item, index) => Number(item) === 0 ? cookiesArr = [] : cookiesArr.splice(Number(item) - 1 - index, 1))
    if (!cookieArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
        return;
    }

    for (let i = 0; i < cookieArr.length; i++) {
        if (cookieArr[i]) {
            currentCookie = cookieArr[i];
            $.UserName = decodeURIComponent(currentCookie.match(/pt_pin=(.+?);/) && currentCookie.match(/pt_pin=(.+?);/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            $.log(`\n************* 检查【京东账号${$.index}】${$.UserName} cookie 是否有效 *************`);
            await TotalBean();
            $.log(`开始【京东账号${$.index}】${$.nickName || $.UserName}\n`);
            if (!$.isLogin) {
                $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/`, {"open-url": "https://bean.m.jd.com/"});
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }
                continue
            }
            subTitle = '';
            message = '';
            option = {};
            $.answer = 3;
            $.helpNum = 0;
            notifyBool = notifyLevel > 0; // 初始化是否推送
            await tokenFormat(); // 处理当前账号 token
            await shareCodesFormat(); // 处理当前账号 助力码
            await jdJXNC(); // 执行当前账号 主代码流程
        }
    }
    if ($.isNode() && allMessage) {
      await notify.sendNotify(`${$.name}`, `${allMessage}`)
    }
})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
        console.log(e);
    })
    .finally(() => {
        $.done();
    })

// 检查互助码格式是否为 json
// 成功返回 json 对象，失败返回 ''
function changeShareCodeJson(code) {
    try {
        let json = code && JSON.parse(code);
        return json['smp'] && json['active'] && json['joinnum'] ? json : '';
    } catch (e) {
        return '';
    }
}

// 加载配置 cookie token shareCode
function requireConfig() {
    return new Promise(async resolve => {
        $.log('开始获取配置文件\n')
        notify = $.isNode() ? require('./sendNotify') : '';
        //Node.js用户请在jdCookie.js处填写京东ck;
        const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
        const jdTokenNode = $.isNode() ? require('./jdJxncTokens.js') : '';
        const jdJxncShareCodeNode = $.isNode() ? require('./jdJxncShareCodes.js') : '';
        //IOS等用户直接用NobyDa的jd cookie
        if ($.isNode()) {
            Object.keys(jdCookieNode).forEach((item) => {
                if (jdCookieNode[item]) {
                    cookieArr.push(jdCookieNode[item]);
                }
            })
            if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {
            };
        } else {
            cookieArr.push(...[$.getdata('CookieJD'), $.getdata('CookieJD2')]);
        }

        $.log(`共${cookieArr.length}个京东账号\n`);

        if ($.isNode()) {
            Object.keys(jdTokenNode).forEach((item) => {
                tokenArr.push(jdTokenNode[item] ? JSON.parse(jdTokenNode[item]) : tokenNull)
            })
        } else {
            let tmpTokens = JSON.parse($.getdata('jx_tokens') || '[]');
            tokenArr.push(...tmpTokens)
        }

        if ($.isNode()) {
            Object.keys(jdJxncShareCodeNode).forEach((item) => {
                if (jdJxncShareCodeNode[item]) {
                    jxncShareCodeArr.push(jdJxncShareCodeNode[item])
                } else {
                    jxncShareCodeArr.push('');
                }
            })
        }

        // 检查互助码是否为 json [smp,active,joinnum] 格式，否则进行通知
        for (let i = 0; i < jxncShareCodeArr.length; i++) {
            if (jxncShareCodeArr[i]) {
                let tmpJxncShareStr = jxncShareCodeArr[i];
                let tmpjsonShareCodeArr = tmpJxncShareStr.split('@');
                if (!changeShareCodeJson(tmpjsonShareCodeArr[0])) {
                    $.log('互助码格式已变更，请重新填写互助码');
                    $.msg($.name, '互助码格式变更通知', '互助码格式变更，请重新填写 ‼️‼️', option);
                    if ($.isNode()) {
                     //   await notify.sendNotify(`${$.name}`, `互助码格式变更，请重新填写 ‼️‼️`);
                    }
                }
                break;
            }
        }

        // console.log(`jdFruitShareArr::${JSON.stringify(jxncShareCodeArr)}`)
        // console.log(`jdFruitShareArr账号长度::${jxncShareCodeArr.length}`)
        $.log(`您提供了${jxncShareCodeArr.length}个账号的京喜农场助力码`);

    //     try {
    //         let options = {
    //             "url": `https://gitee.com/guyuexuan/jd_share_code/raw/master/share_code/jxnc.json`,
    //             "headers": {
    //                 "Accept": "application/json,text/plain, */*",
    //                 "Content-Type": "application/x-www-form-urlencoded",
    //                 "Accept-Encoding": "gzip, deflate, br",
    //                 "Accept-Language": "zh-cn",
    //                 "Connection": "keep-alive",
    //                 "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_1_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36"
    //             },
    //             "timeout": 10000,
    //         }
    //         $.get(options, (err, resp, data) => { // 初始化内置变量
    //             if (!err) {
    //                 shareCode = data;
    //            }
    //        });
    //    } catch (e) {
    //         // 获取内置助力码失败
    //    }
        resolve()
    })
}

// 查询京东账户信息（检查 cookie 是否有效）
function TotalBean() {
    return new Promise(async resolve => {
        const options = {
            "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
            "headers": {
                "Accept": "application/json,text/plain, */*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-cn",
                "Connection": "keep-alive",
                "Cookie": currentCookie,
                "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0")
            }
        }
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
            if (data['retcode'] === 13) {
              $.isLogin = false; //cookie过期
              return
            }
            if (data['retcode'] === 0) {
              $.nickName = data['base'].nickname;
            } else {
              $.nickName = $.UserName
            }
                    } else {
                        console.log(`京东服务器返回空数据`)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

// 处理当前账号token
function tokenFormat() {
    return new Promise(async resolve => {
        if (tokenArr[$.index - 1] && tokenArr[$.index - 1].farm_jstoken) {
            currentToken = tokenArr[$.index - 1];
            $.log(`1当前京东账号TOKEN${JSON.stringify(currentToken)}`)
        } else {
            currentToken = tokenNull;
            $.log(`2当前京东账号TOKEN${JSON.stringify(currentToken)}`)
        }
        resolve();
    })
}

// 处理当前账号助力码
function shareCodesFormat() {
    return new Promise(async resolve => {
        // console.log(`第${$.index}个京东账号的助力码:::${jdFruitShareArr[$.index - 1]}`)
        if (jxncShareCodeArr[$.index - 1]) {
            currentShareCode = jxncShareCodeArr[$.index - 1].split('@');
            currentShareCode.push(...(shareCode.split('@')));
        } else {
            $.log(`由于您第${$.index}个京东账号未提供shareCode,将采纳本脚本自带的助力码`)
            currentShareCode = shareCode.split('@');
        }
        $.log(`第${$.index}个京东账号将要助力的好友${JSON.stringify(currentShareCode)}`)
        resolve();
    })
}

async function jdJXNC() {
    subTitle = `【京东账号${$.index}】${$.nickName}`;
    $.log(`获取用户信息 & 任务列表`);
    const startInfo = await getTaskList();
    if (startInfo) {
        message += `【水果名称】${startInfo.prizename}\n`;
        if (startInfo.target <= startInfo.score) { // 水滴已满
            if (startInfo.activestatus === 2) { // 成熟未收取
                notifyBool = true;
                $.log(`【成熟】水果已成熟请及时收取，activestatus：${startInfo.activestatus}\n`);
                message += `【成熟】水果已成熟请及时收取，activestatus：${startInfo.activestatus}\n`;
            } else if (startInfo.activestatus === 0) { // 未种植（成熟已收取）
                $.log('账号未选择种子，请先去京喜农场选择种子。\n如果选择 APP 专属种子，必须提供 token。');
                message += '账号未选择种子，请先去京喜农场选择种子。\n如果选择 APP 专属种子，必须提供 token。\n';
                notifyBool = notifyBool && notifyLevel >= 3;
            }
        } else {
            let shareCodeJson = {
                "smp": $.info.smp,
                "active": $.info.active,
                "joinnum": $.info.joinnum,
            };
            $.log(`【京东账号${$.index}（${$.nickName || $.UserName}）的${$.name}好友互助码】` + JSON.stringify(shareCodeJson));
            await $.wait(500);
     const isOk = await browserTask();
            if (isOk) {
                await $.wait(500);
                await answerTask();
                await $.wait(500);
                const endInfo = await getTaskList();
                getMessage(endInfo, startInfo);
                await submitInviteId($.UserName);
                await $.wait(500);
                let next = await helpFriends();
            }
        }
    }
    await showMsg()      
}

// 获取任务列表与用户信息
function getTaskList() {
    return new Promise(async resolve => {
        $.get(taskUrl('query', `type=1`), async (err, resp, data) => {
            try {
                const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
                const {detail, msg, task = [], retmsg, ...other} = JSON.parse(res);
                $.detail = detail;
                $.helpTask = task.filter(x => x.tasktype === 2)[0] || {eachtimeget: 0, limit: 0};
                $.allTask = task.filter(x => x.tasktype !== 3 && x.tasktype !== 2 && parseInt(x.left) > 0);
                $.info = other;
                $.log(`获取任务列表 ${retmsg} 总共${$.allTask.length}个任务！`);
                if (!$.info.active) {
                    $.log('账号未选择种子，请先去京喜农场选择种子。\n如果选择 APP 专属种子，必须提供 token。');
                    message += '账号未选择种子，请先去京喜农场选择种子。\n如果选择 APP 专属种子，必须提供 token。\n';
                    notifyBool = notifyBool && notifyLevel >= 3;
                    resolve(false);
                }
                resolve(other);
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(true);
            }
        });
    });
}

function browserTask() {
    return new Promise(async resolve => {
        const tasks = $.allTask.filter(x => x.tasklevel !== 6);
        const times = Math.max(...[...tasks].map(x => x.limit));
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            $.log(`开始第${i + 1}个任务：${task.taskname}`);
            const status = [0];
            for (let i = 0; i < times; i++) {
                const random = Math.random() * 3;
                await $.wait(random * 1000);
                if (status[0] === 0) {
                    status[0] = await doTask(task);
                }
                if (status[0] !== 0) {
                    break;
                }
            }
            if (status[0] === 1017) { // ret:1017 retmsg:"score full" 水滴已满，果实成熟，跳过所有任务
                $.log('水滴已满，果实成熟，跳过所有任务');
                resolve(true);
                break;
            }
            if (status[0] === 1032) {
                $.log('任务执行失败，种植的 APP 专属种子，请提供 token 或种植非 APP 种子');
                message += '任务执行失败，种植的 APP 专属种子，请提供 token 或种植非 APP 种子\n';
                notifyBool = notifyBool && notifyLevel >= 2;
                resolve(false);
                return;
            }

            $.log(`结束第${i + 1}个任务：${task.taskname}`);
        }
        resolve(true);
    });
}

function answerTask() {
    const _answerTask = $.allTask.filter(x => x.tasklevel === 6);
    if (!_answerTask || !_answerTask[0]) return;
    const {tasklevel, left, taskname, eachtimeget} = _answerTask[0];
    $.log(`准备做答题任务：${taskname}`);
    return new Promise(async resolve => {
        if (parseInt(left) <= 0) {
            resolve(false);
            $.log(`${taskname}[做任务]： 任务已完成，跳过`);
            return;
        }
        $.get(
            taskUrl(
                'dotask',
                `active=${$.info.active}&answer=${$.info.indexday}:${['A', 'B', 'C', 'D'][$.answer]}:0&joinnum=${
                    $.info.joinnum
                }&tasklevel=${tasklevel}`,
            ),
            async (err, resp, data) => {
                try {
                    const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
                    let {ret, retmsg, right} = JSON.parse(res);
                    retmsg = retmsg !== '' ? retmsg : '成功';
                    $.log(`${taskname}[做任务]：ret:${ret} retmsg:"${retmsg.indexOf('活动太火爆了') !== -1 ? '任务进行中或者未到任务时间' : retmsg}"`);
                    if (ret === 0 && right === 1) {
                        $.drip += eachtimeget;
                    }
                    // ret:1017 retmsg:"score full" 水滴已满，果实成熟，跳过答题
                    // ret:1012 retmsg:"has complte" 已完成，跳过答题
                    if (ret === 1017 || ret === 1012) {
                        resolve();
                        return;
                    }
                    if (((ret !== 0 && ret !== 1029) || retmsg === 'ans err') && $.answer > 0) {
                        $.answer--;
                        await $.wait(1000);
                        await answerTask();
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve();
                }
            },
        );
    });
}

function getMessage(endInfo, startInfo) {
    const need = endInfo.target - endInfo.score;
    const get = endInfo.modifyscore; // 本次变更获得水滴
    const leaveGet = startInfo.modifyscore; // 离开时获得水滴
    let dayGet = 0; // 今日共获取水滴数
    if ($.detail) {
        let dayTime = new Date(new Date().toLocaleDateString()).getTime() / 1000; // 今日 0 点时间戳（10位数）
        $.detail.forEach(function (item, index) {
            if (item.time >= dayTime && item.score) {
                dayGet += item.score;
            }
        });
    }
    message += `【水滴】本次获得${get} 离线获得${leaveGet} 今日获得${dayGet} 还需水滴${need}\n`;
    if (need <= 0) {
        notifyBool = true;
        message += `【成熟】水果已成熟请及时收取，deliverState：${endInfo.deliverState}\n`;
        return;
    }
    if (get > 0 || leaveGet > 0 || dayGet > 0) {
        const day = Math.ceil(need / (dayGet > 0 ? dayGet : (get + leaveGet)));
        message += `【预测】还需 ${day} 天\n`;
    }
    if (get > 0 || leaveGet > 0) { // 本次 或 离线 有水滴
        notifyBool = notifyBool && notifyLevel >= 1;
    } else {
        notifyBool = notifyBool && notifyLevel >= 2;
    }
}

// 提交助力码
function submitInviteId(userName) {
    return new Promise(resolve => {
        if (!$.info || !$.info.smp) {
            resolve();
            return;
        }
        try {
            $.post(
                {
                    url: `https://api.ninesix.cc/api/jx-nc/${$.info.smp}/${encodeURIComponent(userName)}?active=${$.info.active}&joinnum=${$.info.joinnum}`,
                    timeout: 10000
                },
                (err, resp, _data) => {
                    try {
                        const {code, data = {}} = JSON.parse(_data);
                        $.log(`邀请码提交：${code}`);
                        if (data.value) {
                            message += '【邀请码】提交成功！\n';
                        }
                    } catch (e) {
                        // $.logErr(e, resp);
                        $.log('邀请码提交失败 API 返回异常');
                    } finally {
                        resolve();
                    }
                },
            );
        } catch (e) {
            // $.logErr(e, resp);
            resolve();
        }
    });
}

function getAssistUser() {
    return new Promise(resolve => {
        try {
            $.get({url: `https://api.ninesix.cc/api/jx-nc?active=${$.info.active}`, timeout: 10000}, async (err, resp, _data) => {
                try {
                    const {code, data: {value, extra = {}} = {}} = JSON.parse(_data);
                    if (value && extra.active) { //  && extra.joinnum 截止 2021-01-22 16:39:09 API 线上还未部署新的 joinnum 参数代码，暂时默认 1 兼容
                        let shareCodeJson = {
                            'smp': value,
                            'active': extra.active,
                            'joinnum': extra.joinnum || 1
                        };
                        $.log(`获取随机助力码成功 ` + JSON.stringify(shareCodeJson));
                        resolve(shareCodeJson);
                        return;
                    } else {
                        $.log(`获取随机助力码失败 ${code}`);
                    }
                } catch (e) {
                    // $.logErr(e, resp);
                    $.log('获取随机助力码失败 API 返回异常');
                } finally {
                    resolve(false);
                }
            });
        } catch (e) {
            // $.logErr(e, resp);
            resolve(false);
        }
    });
}

// 为好友助力 return true 继续助力  false 助力结束
async function helpFriends() {
    for (let code of currentShareCode) {
        if (!code) {
            continue
        }
        let tmpShareCodeJson = changeShareCodeJson(code);
        if (!tmpShareCodeJson) { //非 json 格式跳过
            console.log('助力码非 json 格式，跳过')
            continue;
        }
        const next = await helpShareCode(tmpShareCodeJson['smp'], tmpShareCodeJson['active'], tmpShareCodeJson['joinnum']);
        if (!next) {
            return false;
        }
        await $.wait(1000);
    }
    return true;
}

// 执行助力 return true 继续助力  false 助力结束
function helpShareCode(smp, active, joinnum) {
    return new Promise(async resolve => {
        if (smp === $.info.smp) { // 自己的助力码，跳过，继续执行
            $.log('助力码与当前账号相同，跳过助力。准备进行下一个助力');
            resolve(true);
        }
        $.log(`即将助力 share {"smp":"${smp}","active":"${active}","joinnum":"${joinnum}"}`);
        $.get(
            taskUrl('help', `active=${active}&joinnum=${joinnum}&smp=${smp}`),
            async (err, resp, data) => {
                try {
                    const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
                    const {ret, retmsg = ''} = JSON.parse(res);
                    $.log(`助力结果：ret=${ret} retmsg="${retmsg ? retmsg : 'OK'}"`);
                    // ret=0 助力成功
                    // ret=1011 active 不同
                    // ret=1012 has complete 已完成
                    // ret=1013 retmsg="has expired" 已过期
                    // ret=1009 retmsg="today has help p2p" 今天已助力过
                    // ret=1021 cannot help self 不能助力自己
                    // ret=1032 retmsg="err operate env" 被助力者为 APP 专属种子，当前助力账号未配置 TOKEN
                    // if (ret === 0 || ret === 1009 || ret === 1011 || ret === 1012 || ret === 1021 || ret === 1032) {
                    //     resolve(true);
                    //     return;
                    // }
                    // ret 1016 当前账号达到助力上限
                    // ret 147 filter 当前账号黑号了
                    if (ret === 147 || ret === 1016) {
                        if (ret === 147) {
                            $.log(`\n\n  !!!!!!!!   当前账号黑号了  !!!!!!!!  \n\n`);
                        }
                        resolve(false);
                        return;
                    }
                    resolve(true);
                    return;
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(false);
                }
            },
        );
    });
}


function doTask({tasklevel, left, taskname, eachtimeget}) {
    return new Promise(async resolve => {
        if (parseInt(left) <= 0) {
            $.log(`${taskname}[做任务]： 任务已完成，跳过`);
            resolve(false);
        }
        $.get(
            taskUrl(
                'dotask',
                `active=${$.info.active}&answer=${$.info.indexday}:D:0&joinnum=${$.info.joinnum}&tasklevel=${tasklevel}`,
            ),
            (err, resp, data) => {
                try {
                    const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
                    let {ret, retmsg} = JSON.parse(res);
                    retmsg = retmsg !== '' ? retmsg : '成功';
                    $.log(`${taskname}[做任务]：ret:${ret} retmsg:"${retmsg.indexOf('活动太火爆了') !== -1 ? '任务进行中或者未到任务时间' : retmsg}"`);
                    if (ret === 0) {
                        $.drip += eachtimeget;
                    }
                    resolve(ret);
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve();
                }
            },
        );
    });
}

function taskUrl(function_path, body) {
    return {
        url: `${JXNC_API_HOST}cubeactive/farm/${function_path}?${body}&farm_jstoken=${currentToken['farm_jstoken']}&phoneid=${currentToken['phoneid']}&timestamp=${currentToken['timestamp']}&sceneval=2&g_login_type=1&callback=whyour&_=${Date.now()}&g_ty=ls`,
        headers: {
            Cookie: currentCookie,
            Accept: `*/*`,
            Connection: `keep-alive`,
            Referer: `https://st.jingxi.com/pingou/dream_factory/index.html`,
            'Accept-Encoding': `gzip, deflate, br`,
            Host: `wq.jd.com`,
            'Accept-Language': `zh-cn`,
           // 'User-Agent':'jdpingou;android;4.1.0;10;1ccd38f77bbfe207-35667505667247;network/wifi;model/M2007J3SC;appBuild/15227;partner/xiaomi;;session/175;aid/791701b9d2a2a1f3;oaid/0d3c61196b69d753;pap/JA2019_3111789;brand/Xiaomi;Mozilla/5.0 (Linux; Android 10; M2007J3SC Build/QKQ1.200419.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.198 Mobile Safari/537.36'
        },
        timeout: 10000,
    };
}

// prettier-ignore
!function(n){"use strict";function t(n,t){var r=(65535&n)+(65535&t);return(n>>16)+(t>>16)+(r>>16)<<16|65535&r}function r(n,t){return n<<t|n>>>32-t}function e(n,e,o,u,c,f){return t(r(t(t(e,n),t(u,f)),c),o)}function o(n,t,r,o,u,c,f){return e(t&r|~t&o,n,t,u,c,f)}function u(n,t,r,o,u,c,f){return e(t&o|r&~o,n,t,u,c,f)}function c(n,t,r,o,u,c,f){return e(t^r^o,n,t,u,c,f)}function f(n,t,r,o,u,c,f){return e(r^(t|~o),n,t,u,c,f)}function i(n,r){n[r>>5]|=128<<r%32,n[14+(r+64>>>9<<4)]=r;var e,i,a,d,h,l=1732584193,g=-271733879,v=-1732584194,m=271733878;for(e=0;e<n.length;e+=16)i=l,a=g,d=v,h=m,g=f(g=f(g=f(g=f(g=c(g=c(g=c(g=c(g=u(g=u(g=u(g=u(g=o(g=o(g=o(g=o(g,v=o(v,m=o(m,l=o(l,g,v,m,n[e],7,-680876936),g,v,n[e+1],12,-389564586),l,g,n[e+2],17,606105819),m,l,n[e+3],22,-1044525330),v=o(v,m=o(m,l=o(l,g,v,m,n[e+4],7,-176418897),g,v,n[e+5],12,1200080426),l,g,n[e+6],17,-1473231341),m,l,n[e+7],22,-45705983),v=o(v,m=o(m,l=o(l,g,v,m,n[e+8],7,1770035416),g,v,n[e+9],12,-1958414417),l,g,n[e+10],17,-42063),m,l,n[e+11],22,-1990404162),v=o(v,m=o(m,l=o(l,g,v,m,n[e+12],7,1804603682),g,v,n[e+13],12,-40341101),l,g,n[e+14],17,-1502002290),m,l,n[e+15],22,1236535329),v=u(v,m=u(m,l=u(l,g,v,m,n[e+1],5,-165796510),g,v,n[e+6],9,-1069501632),l,g,n[e+11],14,643717713),m,l,n[e],20,-373897302),v=u(v,m=u(m,l=u(l,g,v,m,n[e+5],5,-701558691),g,v,n[e+10],9,38016083),l,g,n[e+15],14,-660478335),m,l,n[e+4],20,-405537848),v=u(v,m=u(m,l=u(l,g,v,m,n[e+9],5,568446438),g,v,n[e+14],9,-1019803690),l,g,n[e+3],14,-187363961),m,l,n[e+8],20,1163531501),v=u(v,m=u(m,l=u(l,g,v,m,n[e+13],5,-1444681467),g,v,n[e+2],9,-51403784),l,g,n[e+7],14,1735328473),m,l,n[e+12],20,-1926607734),v=c(v,m=c(m,l=c(l,g,v,m,n[e+5],4,-378558),g,v,n[e+8],11,-2022574463),l,g,n[e+11],16,1839030562),m,l,n[e+14],23,-35309556),v=c(v,m=c(m,l=c(l,g,v,m,n[e+1],4,-1530992060),g,v,n[e+4],11,1272893353),l,g,n[e+7],16,-155497632),m,l,n[e+10],23,-1094730640),v=c(v,m=c(m,l=c(l,g,v,m,n[e+13],4,681279174),g,v,n[e],11,-358537222),l,g,n[e+3],16,-722521979),m,l,n[e+6],23,76029189),v=c(v,m=c(m,l=c(l,g,v,m,n[e+9],4,-640364487),g,v,n[e+12],11,-421815835),l,g,n[e+15],16,530742520),m,l,n[e+2],23,-995338651),v=f(v,m=f(m,l=f(l,g,v,m,n[e],6,-198630844),g,v,n[e+7],10,1126891415),l,g,n[e+14],15,-1416354905),m,l,n[e+5],21,-57434055),v=f(v,m=f(m,l=f(l,g,v,m,n[e+12],6,1700485571),g,v,n[e+3],10,-1894986606),l,g,n[e+10],15,-1051523),m,l,n[e+1],21,-2054922799),v=f(v,m=f(m,l=f(l,g,v,m,n[e+8],6,1873313359),g,v,n[e+15],10,-30611744),l,g,n[e+6],15,-1560198380),m,l,n[e+13],21,1309151649),v=f(v,m=f(m,l=f(l,g,v,m,n[e+4],6,-145523070),g,v,n[e+11],10,-1120210379),l,g,n[e+2],15,718787259),m,l,n[e+9],21,-343485551),l=t(l,i),g=t(g,a),v=t(v,d),m=t(m,h);return[l,g,v,m]}function a(n){var t,r="",e=32*n.length;for(t=0;t<e;t+=8)r+=String.fromCharCode(n[t>>5]>>>t%32&255);return r}function d(n){var t,r=[];for(r[(n.length>>2)-1]=void 0,t=0;t<r.length;t+=1)r[t]=0;var e=8*n.length;for(t=0;t<e;t+=8)r[t>>5]|=(255&n.charCodeAt(t/8))<<t%32;return r}function h(n){return a(i(d(n),8*n.length))}function l(n,t){var r,e,o=d(n),u=[],c=[];for(u[15]=c[15]=void 0,o.length>16&&(o=i(o,8*n.length)),r=0;r<16;r+=1)u[r]=909522486^o[r],c[r]=1549556828^o[r];return e=i(u.concat(d(t)),512+8*t.length),a(i(c.concat(e),640))}function g(n){var t,r,e="";for(r=0;r<n.length;r+=1)t=n.charCodeAt(r),e+="0123456789abcdef".charAt(t>>>4&15)+"0123456789abcdef".charAt(15&t);return e}function v(n){return unescape(encodeURIComponent(n))}function m(n){return h(v(n))}function p(n){return g(m(n))}function s(n,t){return l(v(n),v(t))}function C(n,t){return g(s(n,t))}function A(n,t,r){return t?r?s(t,n):C(t,n):r?m(n):p(n)}$.md5=A}(this);
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}