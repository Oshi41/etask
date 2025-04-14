import {etask} from "./etask.js";


/////////////////////
// User experience //
/////////////////////

const api = {};
const router = etask(async function express_router(req, res, next) {

    // subscribe on request events
    req.on('close', err => err ? this.reject(err) : this.resolve());

    this.catch(async error => {
        this.metric('response.error')
            .post_metric({url: req.url, error, code: res.code})
            .track()
            .log_error({error, etask: this.name});

        if (!req.headersSent) await req.code(500).send('Internal server error');
    });
    this.then(() => {
        this.metric('response.success')
            .post_metric({url: req.url, code: res.code})
            .track()
            .log_trace({etask: this.name});
    });
    this.finally(async () => {
        this.metric('response.stats')
            .post_metric({
                url: req.url,
                code: res.code,
                usage: {
                    read: req.socket.bytesRead,
                    sent: req.socket.bytesWritten,
                },
                timeline: this.metric.timeline,
            })
            .log_trace({etask: this.name});

        this.metric('response.time').average_metric(this.timeline.total());

        if (!req.headersSent) await res.code(200).send('ok');
    });

    // max awaiting time for request
    this.timeout(1000 * 60 * 10);

    // spawn children in async way
    // parent will not finish until
    // all the children finished
    this.spawn(async function () {
        req.user = await api.v1.load_user(req.headers.get('user'));
    });
    this.spawn(async function () {
        req.geo = await api.v1.load_position(req.headers.get('location'));
    });

    this.metric('response.api_requests.start')
        .track()
        .log_trace({etask: this.name, msg: 'starting api requests'});

    await this.wait4children();

    this.metric('response.api_requests.finish')
        .measure_with_label('response.api_requests', 'response.api_requests.start')
        .log_trace({etask: this.name, msg: 'starting api requests'});

    next();

    // put itself into await step until explicit reject\resolve calls
    return this.wait();
})

///////////////
// Use cases //
///////////////
etask(async function prevent_next_code_execution(obj) {
    this.sleep(1000).then(() => this.throw('timeout'));

    // in case of long time response, timeout will be throws
    const req = await fetch('some_url');
    // but promise will continue executing and obj will be changed
    obj.resp = await req.json();
})