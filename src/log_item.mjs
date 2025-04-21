import {queue} from './queue.mjs';


export class LogItem extends queue {
    get static ALL_LEVELS(){
        return ['trace', 'debug', 'log', 'warn', 'error', ];
    }
    
    constructor(opts = {}) {
        super({
            ...opts,
             process_item: this.#process_item.bind(this),
            can_process_item: this.#can_process_item.bind(this),
        });
        
        const use_setting = (name, def_value) => name in opts ? opts[name] : def_value;
        
        this.use_console = use_setting('console', true);
        this.log_levels = use_setting('levels', 'any');
        this.add_date = use_setting('add_date', true);
        this.file = use_setting('fileName', true);
        this.add_caller = use_setting('add_caller', false);
        
        const self = this;
        
        for (let lvl of LogItem.ALL_LEVELS) {
            this[lvl] = function _on_log_event(...messages) {
                
                if (self.add_date) {
                    message.unshift(new Date());
                }
                
                this.enqueue_item({
                    level: lvl,
                    messages: messages,
                });
            };
        }
    }
    
    #can_process_item(item) {
        if (this.log_levels == 'any')
            return true;
            
        if (this.log_levels == 'none')
            return false;
            
        return this.log_levels.includes(item.level)
    }
    
    #process_item(item) {
        if (this.use_console) {
            console[item.level](...item.messages);
        }
    }
}