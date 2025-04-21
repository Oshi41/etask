import {queue} from './queue.mjs';
import {get_stack} from './err.mjs';


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
        this.from_stack = {
            getFileName: use_setting('log_file', true),
            getFunctionName: use_setting('log_function_name', true),
            getLine: use_setting('log_line', true),
            getColumn: use_setting('log_column', true),            
            date: use_setting('log_date', true),
        };
        this.stat = {
            file: use_setting('log_file_owner', false)
                ?
                : null,
        };
        
        for (let lvl of LogItem.ALL_LEVELS)
            this[lvl] = (...messages) => this.#log_event(lvl, messages);
    }
    
    #log_event(level, messages) {
        const item = {level, messages};
        if (!await this.#can_process_item(item))
            return;
        
        if (this.from_stack.date) {
            item.messages.unshift(new Date());
        }
        
        if (this.stat.file)
            item.messages.unshift(this.stat.file);
        
        const stack = get_stack({
            ...this.from_stack,
            limit: 3
        }).at(-1);
        
        this.enqueue_item(item);
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