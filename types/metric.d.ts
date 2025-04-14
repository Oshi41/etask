export interface IMetricEvent {
    get name(): string;
    get timestamp(): number;
    get value(): number | Error | Map<string, any>;
    

    get_meta<TValue, TKey>(key: ContainsWord<TKey>): MetaKeyResult<TValue>;
    set_meta<T>(key: string, value: T): Boolean;
    
}

type MetaKeys = {
    
}

type StringKeys = 'sender' | 'http.status' | 'message'
    | '';
type NumKeys = 

type MetaKeyResult<T> = { has: false } | {has: true, value: T};
type ContainsWord<T> = T 
    | `${string}.${T}.${string}`
    | `${string}.${T}`
    | `${T}.${string}`;

type Enumerate<N extends any, Acc extends N[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length'], `${Acc['length']}`]>

