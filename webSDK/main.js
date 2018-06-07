const sdk = VoxImplant.getInstance();
    sdk.init({
        micRequired: true,
    })
        .then(()=>{
            console.log('This code is executed after SDK successfully initializes');
            return sdk.connect();
        })
        .then(()=>{
            console.log('This code is executed after SDK is successfully connected to Voximplant');
            return sdk.login('callee@dialogflow-v1.kuligin.voximplant.com','123123');
        })
        .then(()=>{
            console.log('This code is executed on successfull login');
            sdk.on(VoxImplant.Events.IncomingCall, (e) => {
                e.call.answer();
                console.log('You can hear audio from the cloud');
                e.call.on(VoxImplant.CallEvents.Disconnected, () => console.log('The call has ended'));
                e.call.on(VoxImplant.CallEvents.Failed, (e) => console.log(`Call failed with the ${e.code} error`));
            });
        })
        .catch((e)=>{
            console.log(e);
        });