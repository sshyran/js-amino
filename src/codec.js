const RegisteredType = require("./registeredType").RegisteredType
const Reflection = require("./reflect")
const BinaryEncoder = require("./binaryEncoder")
const BinaryDecoder = require("./binaryDecoder")
const TypeFactory = require("./typeFactory")
const Utils = require("./utils")

let {
    Types,
    WireType
} = require('./types')


let instance = null;

let privObj = {
    typeMap: null
}

class Codec {

    constructor() {
        if (!instance) {
            instance = this;
        }
        privObj.typeMap = new Map()
        return instance;
    }

    lookup(typeName) {
        return this.typeMap.get(typeName);
    }

    set(typeName, registeredType) {
        privObj.typeMap.set(typeName, registeredType)
    }

    registerConcrete(instance, name, opt) {
        let typeName = Reflection.typeOf(instance);
        if (this.lookup(typeName)) {
            throw new Error(`${typeName} was registered`)
        }
        let registeredType = new RegisteredType(name, typeName)
        this.set(typeName, registeredType)

    }

    marshalJson(obj) {
        if (!obj) return null;
        let typeInfo = this.lookup(Reflection.typeOf(obj))
        let serializedObj = {
            type: typeInfo.disfix.toString('hex'),
            value: {}
        }
        serializedObj.value = Object.assign({}, obj)

        return JSON.stringify(serializedObj);

    }

    unMarshalJson(json, instance) {
        let deserializedObj = JSON.parse(json)
        let typeName = Reflection.typeOf(instance);
        if (!this.lookup(typeName)) {
            throw new Error(`No ${typeName} was registered`)
            return;
        }
        Object.assign(instance, deserializedObj.value)

    }

    marshalBinary(obj) {
        if (!obj) return null;
        let typeInfo = this.lookup(Reflection.typeOf(obj))
        if (!typeInfo) return null;
        let encodedData = BinaryEncoder.encodeBinary(obj)
        let binWithoutLenPrefix = typeInfo.prefix.concat(encodedData);
        let lengthPrefix = binWithoutLenPrefix.length;
        return [lengthPrefix].concat(binWithoutLenPrefix)

    }

    unMarshalBinary(bz, instance) {
        if( bz.length == 0 ) throw new RangeError("UnmarshalBinary cannot decode empty bytes")
        if( !instance ) throw new TypeError("UnmarshalBinary cannot decode to Null instance")
        let typeName = Reflection.typeOf(instance)
        let typeInfo = this.lookup(typeName)
        if( !typeInfo ) throw new TypeError(`No ${typeName} was registered`)
        let length = bz[0]
        let realbz = bz.slice(1);  
        if(length != realbz.length) throw new RangeError("Wrong length")      
        if( !Utils.isEqual(realbz.slice(0,4),typeInfo.prefix )) {
            throw new TypeError("prefix not match")
        }
        realbz = bz.slice(5)
        BinaryDecoder.decodeBinary(realbz,instance)

    }
    get typeMap() {
        return privObj.typeMap;
    }
}

module.exports = {
    Codec
}



if (require.main === module) {
    let codec1 = new Codec();

    let SubA = TypeFactory.create('SubA', [{
        name: "a",
        type: Types.String
    },
    {
        name: "b",
        type: Types.Int8
    },
    {
        name: "sub2",
        type: Types.Struct
    }])

    let SubA2 = TypeFactory.create('SubA2', [ {
       name: "a",
        type: Types.String
    },
    {
        name: "b",
        type: Types.Int8
    }
])


    let A = TypeFactory.create('A', [{
            name: "a",
            type: Types.Int8
        },
        {
            name: "b",
            type: Types.String
        },
        {
            name: "sub",
            type: Types.Struct
        }
    ])

    let B = TypeFactory.create('B', [{
        name: "a",
        type: Types.String
    },
    {
        name: "b",
        type: Types.Int8
    },
    {
        name: "c",
        type: Types.Int8
    },
    
    {
        name: "d",
        type: Types.Struct
    }
])



    codec1.registerConcrete(new A(), "SimpleStruct", {})  
    let subObj = new SubA(10)
    let subObj2 = new SubA2("Do Ngoc Tan",21)
    let aObj = new A(23,"Sanh la tin", new SubA("Toi la Tan",12,subObj2))    
    let bObj = new A()

    let binary = codec1.marshalBinary(aObj)
     

    codec1.unMarshalBinary(binary,bObj)
    if( Utils.isEqual(aObj,bObj)) {
        console.log("equal")
    }
    else console.log("Not equal")

    console.log(bObj)



   /*
    codec1.registerConcrete(new B(), "SimpleStruct", {})  
    let obj  = new B("Tan",1,2,new SubA2("sanh la tin",21));
    let obj2 = new B();
    let obj3 = new B()
    let binary = codec1.marshalBinary(obj)
    //console.log(binary)    
    console.log(obj)
    codec1.unMarshalBinary(binary,obj2)
    console.log("obj2=",obj2)
    console.log(Utils.isEqual(obj,obj2))
   
*/




}