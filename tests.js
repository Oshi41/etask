import etask from "./etask.js";
import {deepEqual as de, fail} from 'node:assert';

describe('index', () => {
    it('then/finally', async () => {
        let count = 0;
        const result = await etask(function*(){
            this.then(()=>{
               de(count, 1);
               count++;
            });
            this.then(()=>{
                de(count, 2);
                count++;
            });
            this.finally(()=>{
                de(count, 3);
                count++;
            });
            this.finally(()=>{
                de(count, 4);
                count++;
            });
            de(count, 0);
            yield count++;
            return count;
        });
        de(count, 5);
        de(result, 1);
    });
    it('return stop the execution', async () => {
        const result = await etask(function* () {
            this.then(() => {
                this.return(5)
            });
            yield this.return(1);
            return 10;
        });
        de(result, 1);
    });
});