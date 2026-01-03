const logEl = document.getElementById("log");
const x_super_properties = 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiaGFzX2NsaWVudF9tb2RzIjpmYWxzZSwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEzNC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTM0LjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiJodHRwczovL2Rpc2NvcmQuY29tIiwicmVmZXJyaW5nX2RvbWFpbiI6ImRpc2NvcmQuY29tIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM4NDg4NywiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=';
function appendLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    logEl.textContent += '\n' + timestamp + ' - ' + message;
    logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
    logEl.textContent = '';
}

let shouldStopSpam = false;

const tokensInput = document.getElementById('tokens');
const guildInput = document.getElementById('guildId');
const channelInput = document.getElementById('channelIds');
const messageInput = document.getElementById('message');
const randomizeCheckbox = document.getElementById('randomize');
const delayInput = document.getElementById('delay');
const limitInput = document.getElementById('limit');
const mentionInput = document.getElementById('mentionIds');
const pollTitleInput = document.getElementById('pollTitle');
const pollAnswersInput = document.getElementById('pollAnswers');
const forwardUrlInput = document.getElementById('forwardMessageUrl');
const autoFillBtn = document.getElementById('autoFillChannels');
const fetchMentionsBtn = document.getElementById('fetchMentions');
const submitBtn = document.getElementById('submitBtn');
const stopBtn = document.getElementById('stopSpam');
const leaveBtn = document.getElementById('leaveBtn');
const form = document.getElementById('form');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseList(input) {
    const items = input.split(/[\s,]+/)
        .map(item => item.trim())
        .filter(item => item);
    return [...new Set(items)];
}

function parseMessageUrl(url) {
    if (!url) return null;
    const match = url.match(/https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (!match) return null;
    return {
        guildId: match[1],
        channelId: match[2],
        messageId: match[3]
    };
}

async function leaveGuild(token, guildId) {
    const response = await fetch('https://discord.com/api/v9/users/@me/guilds/' + guildId, {
        method: 'DELETE',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
            'x-super-properties': x_super_properties
        },
        body: JSON.stringify({ lurking: false }),
        referrerPolicy: 'no-referrer'
    });

    if (response.status === 204) {
        appendLog('✅ 退出成功: ' + token.slice(0, 10) + '*****');
    } else {
        appendLog('❌ ' + token.slice(0, 10) + '*****\x20-\x20退出失敗(' + JSON.stringify(await response.json()) + ')');
    }
}

autoFillBtn.addEventListener('click', async () => {
    clearLog();
    const tokens = parseList(tokensInput.value);
    const guildId = guildInput.value.trim();

    if (!tokens.length) return appendLog('⚠️ トークンを入力してください');
    if (!guildId) return appendLog('⚠️ サーバーIDを入力してください');

    try {
        const response = await fetch('https://discord.com/api/v9/guilds/' + guildId + '/channels', {
            headers: {
                'Authorization': tokens[0],
                'Content-Type': 'application/json',
                'x-super-properties': x_super_properties
            },
            referrerPolicy: 'no-referrer'
        });

        if (!response.ok) throw new Error(JSON.stringify(await response.json()));

        const channels = await response.json();
        const textChannels = channels
            .filter(ch => ch.type === 0)  // type 0 = テキストチャンネル
            .map(ch => ch.id);

        if (!textChannels.length) return appendLog('チャンネルが見つかりません');

        channelInput.value = textChannels.join(',');
        appendLog('✅ チャンネル取得完了');
    } catch (error) {
        appendLog('❌ ' + token.slice(0, 10) + '*****\x20-\x20エラー：' + error.message);
    }
});

fetchMentionsBtn.addEventListener('click', async () => {
    clearLog();
    const tokens = parseList(tokensInput.value);
    const guildId = guildInput.value.trim();
    const channelIds = parseList(channelInput.value);

    if (!tokens.length) return appendLog('⚠️ トークンを入力してください');
    if (!guildId) return appendLog('⚠️ サーバーIDを入力してください');
    if (!channelIds.length) return appendLog('⚠️ チャンネルIDを入力してください');

    const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

    ws.onopen = () => {
        ws.send(JSON.stringify({
            op: 2, 
            d: {
                token: tokens[0],
                properties: {
                    os: 'Windows',
                    browser: 'Discord',
                    device: 'pc'
                },
                intents: 1 << 12 
            }
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.op === 0 && data.t === 'READY') {
            ws.send(JSON.stringify({
                op: 14,  
                d: {
                    guild_id: guildId,
                    typing: false,
                    activities: false,
                    threads: true,
                    channels: {
                        [channelIds[0]]: [[0, 0]]
                    }
                }
            }));
        }

        if (data.t === 'GUILD_MEMBER_LIST_UPDATE') {
            const members = data.d.ops[0].items
                .filter(item => item.member)
                .map(item => item.member.user.id);

            if (members.length) {
                mentionInput.value = members.join(',');
                appendLog('✅ メンション取得完了');
            } else {
                appendLog('メンションが見つかりません');
            }
            ws.close();
        }
    };

    ws.onerror = () => {
        appendLog('❌ WebSocketエラー');
        ws.close();
    };
});

async function sendMessage(token, channelId, content, options = {}) {
    const headers = {
        'Authorization': token,
        'Content-Type': 'application/json',
        'x-super-properties': x_super_properties
    };

    let body = { content: content || '' };

    if (options.randomize) {
        body.content += '\n' + crypto.randomUUID();
    }

    if (options.allmention) {
        body.content = '@everyone\n' + body.content;
    }

    if (options.randomMentions) {
        const randomUser = options.randomMentions[Math.floor(Math.random() * options.randomMentions.length)];
        body.content = '<@' + randomUser + '>\n' + body.content;
    }

    if (options.pollTitle && options.pollAnswers) {
        body.poll = {
            question: { text: options.pollTitle },
            answers: options.pollAnswers.map(answer => ({
                poll_media: { text: answer.trim() }
            })),
            allow_multiselect: false,
            duration: 1,
            layout_type: 1
        };
    }

    const response = await fetch('https://discord.com/api/v9/channels/' + channelId + '/messages', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        referrerPolicy: 'no-referrer'
    });

    return response;
}

async function forwardMessage(token, channelId, messageRef) {
    const headers = {
        'Authorization': token,
        'Content-Type': 'application/json',
        'x-super-properties': x_super_properties
    };

    let body = {
        mobile_network_type: 'unknown',
        content: '',
        tts: false,
        message_reference: {
            guild_id: messageRef.guildId,
            channel_id: messageRef.channelId,
            message_id: messageRef.messageId,
            type: 1
        },
        flags: 0
    };

    const response = await fetch('https://discord.com/api/v9/channels/' + channelId + '/messages', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        referrerPolicy: 'no-referrer'
    });

    return response;
}

async function authenticateOnly(token) {
    return new Promise(resolve => {
        const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');

        ws.onopen = () => {
            ws.send(JSON.stringify({
                op: 2,
                d: {
                    token: token,
                    properties: {
                        os: 'Windows',
                        browser: 'Discord',
                        device: 'pc'
                    },
                    intents: 0
                }
            }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.t === 'READY') {
                appendLog('✅ 認証完了: ' + token.slice(0, 10) + '*****');
                ws.close();
                resolve(true);
            } else if (data.t === 'INVALID_SESSION') {
                appendLog('❌ 認証失敗: ' + token.slice(0, 10) + '*****');
                ws.close();
                resolve(false);
            }
        };

        ws.onerror = () => {
            appendLog('❌ WebSocket エラー: ' + token.slice(0, 10) + '*****');
            ws.close();
            resolve(false);
        };

        ws.onclose = () => {
            resolve(false);
        };
    });
}

async function sendMessageWithRetry(token, channelId, content, options = {}, maxRetries = 5, retryDelay = 3000) {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await sendMessage(token, channelId, content, options);

            if (response.ok) {
                appendLog('✅ ' + token.slice(0, 10) + '*****\x20-\x20メッセージ送信成功');
                return true;
            } else if (response.status === 429) {
                const data = await response.json();
                const waitTime = (data?.retry_after || 1) * 1000;
                appendLog('⏳  ' + token.slice(0, 10) + '*****\x20-\x20レート制限:\x20' + waitTime / 1000 + 's');
                await sleep(waitTime);
            } else if (response.status === 400) {
                const data = await response.json();
                appendLog('❌ ' + token.slice(0, 10) + '*****\x20-\x20送信エラー(' + response.status + '):\x20' + (JSON.stringify(data) || '詳細不明'));
                const authtest = await authenticateOnly(token);
                if (!authtest) return false;
            } else {
                const data = await response.json();
                appendLog('❌ ' + token.slice(0, 10) + '*****\x20-\x20送信エラー(' + response.status + '):\x20' + (JSON.stringify(data) || '詳細不明'));
                return false;
            }
        } catch (error) {
            appendLog('⚠️ ' + token.slice(0, 10) + '*****\x20-\x20エラー:\x20' + error.message + '\x20|\x20再試行中...');
            await sleep(retryDelay);
            retries++;
        }
    }

    appendLog('❌ トークン(' + token.slice(0, 10) + ')\x20最大リトライ回数に達しました');
    return false;
}

async function forwardMessageWithRetry(token, channelId, messageRef, maxRetries = 5, retryDelay = 3000) {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await forwardMessage(token, channelId, messageRef);

            if (response.ok) {
                appendLog('✅ ' + token.slice(0, 10) + '*****\x20-\x20メッセージ転送成功');
                return true;
            } else if (response.status === 429) {
                const data = await response.json();
                const waitTime = (data?.retry_after || 1) * 1000;
                appendLog('⏳  ' + token.slice(0, 10) + '*****\x20-\x20レート制限:\x20' + waitTime / 1000 + 's');
                await sleep(waitTime);
            } else if (response.status === 400) {
                const data = await response.json();
                appendLog('❌ ' + token.slice(0, 10) + '*****\x20-\x20転送エラー(' + response.status + '):\x20' + (JSON.stringify(data) || '詳細不明'));
                const authtest = await authenticateOnly(token);
                if (!authtest) return false;
            } else {
                const data = await response.json();
                appendLog('❌ ' + token.slice(0, 10) + '*****\x20-\x20転送エラー(' + response.status + '):\x20' + (JSON.stringify(data) || '詳細不明'));
                return false;
            }
        } catch (error) {
            appendLog('⚠️ ' + token.slice(0, 10) + '*****\x20-\x20エラー:\x20' + error.message + '\x20|\x20再試行中...');
            await sleep(retryDelay);
            retries++;
        }
    }

    appendLog('❌ トークン(' + token.slice(0, 10) + ')\x20最大リトライ回数に達しました。');
    return false;
}

function checkFormValidity() {
    const tokens = tokensInput.value.trim();
    const guildId = guildInput.value.trim();
    const message = messageInput.value.trim();
    const forwardUrl = forwardUrlInput.value.trim();

    submitBtn.disabled = !(tokens && guildId && (message || forwardUrl));
}

tokensInput.addEventListener('input', checkFormValidity);
guildInput.addEventListener('input', checkFormValidity);
messageInput.addEventListener('input', checkFormValidity);
forwardUrlInput.addEventListener('input', checkFormValidity);
checkFormValidity();

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();
    const forwardUrl = forwardUrlInput.value.trim();

    if (!message && !forwardUrl) {
        appendLog('⚠️ メッセージ内容または転送URLを入力してください');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.textContent = '実行中...';
    shouldStopSpam = false;
    stopBtn.disabled = false;

    const tokens = parseList(tokensInput.value);
    const guildId = guildInput.value.trim();
    const channelIds = parseList(channelInput.value);
    const randomize = randomizeCheckbox.checked;
    const delay = parseFloat(delayInput.value) || 0;
    const limit = limitInput.value.trim() ? parseInt(limitInput.value) : Infinity;
    const mentionIds = mentionInput.value.trim() ? parseList(mentionInput.value) : null;
    const pollTitle = pollTitleInput.value.trim() || null;
    const pollAnswers = pollAnswersInput.value.trim() ? parseList(pollAnswersInput.value) : null;
    const messageRef = parseMessageUrl(forwardUrl);
    const isForwarding = !!messageRef;

    if (forwardUrl && !messageRef) {
        appendLog('⚠️ 無効な転送URLです');
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = '実行';
        return;
    }

    let totalSent = 0;
    const tasks = [];

    if (isForwarding) {
        const forwardTasks = tokens.map(token => {
            return async () => {
                let channelIndex = 0;
                while (!shouldStopSpam && totalSent < limit) {
                    if (channelIndex >= channelIds.length) channelIndex = 0;
                    const channelId = channelIds[channelIndex];
                    channelIndex++;

                    const success = await forwardMessageWithRetry(token, channelId, messageRef);
                    if (success) totalSent++;
                    else break;

                    if (totalSent >= limit) {
                        appendLog('✅ 指定数に達しました（転送）');
                        break;
                    }

                    if (delay) await sleep(delay * 1000);
                }
            };
        });
        tasks.push(...forwardTasks);
    }

    if (message) {
        const sendTasks = tokens.map(token => {
            return async () => {
                let channelIndex = 0;
                while (!shouldStopSpam && totalSent < limit) {
                    if (channelIndex >= channelIds.length) channelIndex = 0;
                    const channelId = channelIds[channelIndex];
                    channelIndex++;

                    const success = await sendMessageWithRetry(token, channelId, message, {
                        randomize: randomize,
                        randomMentions: mentionIds,
                        pollTitle: pollTitle,
                        pollAnswers: pollAnswers
                    });
                    if (success) totalSent++;
                    else break;

                    if (totalSent >= limit) {
                        appendLog('✅ 指定数に達しました（メッセージ）');
                        break;
                    }

                    if (delay) await sleep(delay * 1000);
                }
            };
        });
        tasks.push(...sendTasks);
    }

    await Promise.all(tasks.map(task => task()));

    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    stopBtn.disabled = true;
    submitBtn.textContent = '実行';
    appendLog('✅ 完了');
});

stopBtn.addEventListener('click', () => {
    shouldStopSpam = true;
    appendLog('🛑 スパムを停止します...');
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.textContent = '実行';
});

leaveBtn.addEventListener('click', async () => {
    shouldStopSpam = true;
    stopBtn.disabled = true;
    appendLog('🛑 スパムを停止します...');

    const tokens = parseList(tokensInput.value);
    const guildId = guildInput.value.trim();

    if (!tokens.length) return appendLog('⚠️ トークンを入力してください');
    if (!guildId) return appendLog('⚠️ サーバーIDを入力してください');

    for (const token of tokens) {
        await leaveGuild(token, guildId);
    }

    appendLog('✅ 退出処理完了');
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.textContent = '実行';
});
