require(Modules.CallList);
require(Modules.ASR);
require(Modules.AI);

// Dialogflow access
const $access_token = "DIALOGFLOW_ACCESS_TOKEN";
const $baseUri = "https://api.dialogflow.com/v1/query?v=20150910";

let call = null;
let first_name, last_name, phone_number;

// Number of failed requests to dialogflow
let attempts = 0;

let step = 1;

// Is ignored?
let silence = false;

// Answers
let ans0, ans1, ans2;

const sessionId = () => Math.floor(100000 * Math.random());


// AppEvents.Started dispatched for each CSV record
VoxEngine.addEventListener(AppEvents.Started, (e) => {
    let data = VoxEngine.customData(); // <-- data from CSV string in JSON format
    data = JSON.parse(data);
    first_name = data.first_name;
    last_name = data.last_name;
    phone_number = data.phone_number;

    Logger.write(`Calling ${first_name} ${last_name} on ${phone_number}`);
    // Call to SDK
    // call = VoxEngine.callUser(phone_number);

    // Call to Phone
    call = VoxEngine.callPSTN(phone_number, "699100813");

    // Trying to detect voicemail
    call.addEventListener(CallEvents.AudioStarted, function(){
        AI.detectVoicemail(call)
    });

    call.addEventListener(CallEvents.Connected, handleCallConnected);
    call.addEventListener(CallEvents.Disconnected, handleCallDisconnected);
    call.addEventListener(CallEvents.Failed, handleCallFailed);
    call.addEventListener(AI.Events.VoicemailDetected, voicemailDetected);
});

function handleCallConnected() {
    setTimeout(function () {
        call.say(`Здравствуйте ${first_name}! Вас беспокоит компания Реактив. Недавно вы делали у нас заказ. Хотите оставить свой отзыв?`, Language.Premium.RU_RUSSIAN_YA_FEMALE);
        call.addEventListener(CallEvents.PlaybackFinished, handleIntroPlayed);
    }, 500);
}

function handleIntroPlayed(){
    call.removeEventListener(CallEvents.PlaybackFinished);

    myasr = VoxEngine.createASR({
        lang: ASRLanguage.RUSSIAN_RU
    });

    asrTimeout = setTimeout(function () {
        recognitionEnded();
        silence = true;
        call.hangup();
    }, 5000);

    myasr.addEventListener(ASREvents.CaptureStarted, function (asrevent) {
        call.stopPlayback();
        clearTimeout(asrTimeout);
    });

    myasr.addEventListener(ASREvents.Result, handleResult);

    // Send call audio to recognition engine
    call.sendMediaTo(myasr);
}

function handleQuestionsPlayed(){
    call.removeEventListener(CallEvents.PlaybackFinished);

    myasr = VoxEngine.createASR({
        lang: ASRLanguage.RUSSIAN_RU
    });

    asrTimeout = setTimeout(function () {
        recognitionEnded();
        silence = true;
        call.hangup();
    }, 5000);

    myasr.addEventListener(ASREvents.CaptureStarted, function (asrevent) {
        call.stopPlayback();
        clearTimeout(asrTimeout);
    });

    myasr.addEventListener(ASREvents.Result, handleResult);

    // Send call audio to recognition engine
    call.sendMediaTo(myasr);
}

function handleResult(asrevent) {
    recognitionEnded();
    let userSpeech = asrevent.text;
    Logger.write("text:  " + userSpeech);
    if (attempts > 5 ){
        call.hangup();
        handleCallFailed();
    }

    switch (step) {
        case 1: // Yes or No question
            makeHttpRequest("YesorNo-followup", userSpeech, (e) => {
                const res = JSON.parse(e.text);
                Logger.write("result:  " + res.result);
                if (!res.result){
                    call.say("Извините, повторите пожалуйста", Language.Premium.RU_RUSSIAN_YA_FEMALE);
                    attempts++;
                    call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
                }
                else if (res.result.action === "input.cancel"){
                    call.hangup();
                }
                else if (res.result.action === "input.unknown"){
                    call.say(res.result.fulfillment.speech, Language.Premium.RU_RUSSIAN_YA_FEMALE);
                    call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
                }
                else if (res.result.action === "answer.no"){
                    call.say("Хорошо! Извините за беспокойство. Всего доброго!", Language.Premium.RU_RUSSIAN_YA_FEMALE);
                    call.addEventListener(CallEvents.PlaybackFinished, () => {
                        ans0 = "No";
                        call.hangup()
                    });
                }
                else if (res.result.action === "answer.yes"){
                    call.say("Понравился ли Вам сервис?", Language.Premium.RU_RUSSIAN_YA_FEMALE);
                    call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
                    step++;
                }
            });
            break;

        case 2: // Yes or No question
            makeHttpRequest("YesorNo-followup", userSpeech, (e) =>{
                    const res = JSON.parse(e.text);
                    if (!res.result){
                        call.say("Извините, повторите пожалуйста", Language.Premium.RU_RUSSIAN_YA_FEMALE);
                        attempts++;
                        call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
                    }
                    else if (res.result.action === "input.unknown"){
                        call.say(res.result.fulfillment.speech, Language.Premium.RU_RUSSIAN_YA_FEMALE);
                        call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
                    }
                    else if (res.result.action === "answer.no" || res.result.action === "answer.yes"){
                        ans1 = res.result.resolvedQuery; // Save the result
                        call.say("Что мы можем улучшить в нашей работе?", Language.Premium.RU_RUSSIAN_YA_FEMALE);
                        call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
                        step++
                    }
            });
            break;

        case 3: // Open question
            makeHttpRequest("", userSpeech, (e) => {
                    const res = JSON.parse(e.text);
                    if (!res.result){
                        call.say("Извините, повторите пожалуйста", Language.Premium.RU_RUSSIAN_YA_FEMALE);
                        attempts++;
                        call.addEventListener(CallEvents.PlaybackFinished, firstPlaybackFinished);
                    }
                    else {
                        ans2 = res.result.resolvedQuery; // Save the result
                        call.say("Мы благодарим вас за оставленный отзыв! Всего Доброго!", Language.Premium.RU_RUSSIAN_YA_FEMALE);
                        call.addEventListener(CallEvents.PlaybackFinished, () => {
                            call.hangup()
                        });
                    }
                });
            break;
    }
}

// Playback finished
function handlePlaybackFinished(e) {
    call.removeEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
    handleQuestionsPlayed();
}

function recognitionEnded(){
    myasr.stop();
}

function voicemailDetected(e) {
    // Is there a Voicemail?
    if (e.confidence >= 75) {
        VoxEngine.CallList.reportError('Voicemail', call.hangup());
    }
}

function makeHttpRequest($contexts, $query, $callback) {
    Net.httpRequest($baseUri+($contexts ? `&contexts=${$contexts}` : "")+"&query=" + encodeURI($query) +
        "&lang=ru&sessionId=" + sessionId() + "&timezone=Asia/Yekaterinburg", $callback,
        { headers: ["Authorization: bearer "+$access_token]});
}

function handleCallDisconnected(e) {
    // Tell CallList processor about successful call result
    CallList.reportResult({
        result: true,
        duration: e.duration,
        answers: {
            ans0: ans0,
            ans1: ans1,
            ans2: ans2,
        },
        silence: silence
    }, VoxEngine.terminate);
}

function handleCallFailed(e) {
    CallList.reportError({
        result: false,
        msg: 'Failed',
        code: e.code
    }, VoxEngine.terminate);
}