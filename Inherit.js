/**
 *  EmployeeA -> ManagerA
 *  混合模式 instanceof没有问题，容易理解 managerA.__proto__ = Employee.prototype, managerA.__proto__.proto__ = Object.prototype
 *  ManagerA.prototype = new EmployeeA(); 参数问题存在隐患
 */
function EmployeeA(name, salary){
    this.name = name;
    this.salary = salary;
}

EmployeeA.prototype = {

    getName: function(){
        return this.name;
    },

    getSalary: function(){
        return this.salary;
    },

    toString: function(){
        return this.getName() + '\'s salary is ' + this.getSalary() + '.';
    }

};

function ManagerA(name, salary, percentage){

    EmployeeA.apply(this, [name, salary]);

    this.percentage = percentage;
}

ManagerA.prototype = new EmployeeA();

ManagerA.prototype.getPercentage = function(){
    return this.percentage;
};

ManagerA.prototype.toString = function(){
    return this.getName() + '\'s salary is ' + this.getSalary() * (1 + this.getPercentage()) + '.';
};

var eA = new EmployeeA('Bill', 5000);
var mA = new ManagerA('Jack', 10000, 0.3);

console.log(eA.toString());
console.log(mA.toString());

console.log(eA instanceof EmployeeA);
console.log(eA instanceof ManagerA);
console.log(mA instanceof EmployeeA);
console.log(mA instanceof ManagerA);


/**
 *  EmployeeB -> ManagerB
 *  强制无参化，将构造函数内部逻辑迁移到实例方法init
 *  保证 ManagerB.prototype = new ManagerB(); 不会出错
 *  实例化之后还要紧跟着执行一次init
 */
function EmployeeB(){
    //无参化
}

EmployeeB.prototype = {
    constructor: EmployeeB,

    init: function(name, salary){
        this.name = name;
        this.salary = salary;
    },

    getName: function(){
        return this.name;
    },

    getSalary: function(){
        return this.salary;
    },

    toString: function(){
        return this.getName() + '\'s salary is ' + this.getSalary() + '.';
    }
};

function ManagerB (){
    //无参化
}

ManagerB.prototype = new EmployeeB();

ManagerB.prototype.constructor = ManagerB;

ManagerB.prototype.init = function(name, salary, percentage){
    EmployeeB.prototype.init.apply(this, [name, salary]);
    this.percentage = percentage;
};

ManagerB.prototype.getPercentage = function(){
    return this.percentage;
};

ManagerB.prototype.toString = function(){
    return this.getName() + '\'s salary is ' + this.getSalary() * (1 + this.getPercentage()) + '.'
};

var eB = new EmployeeB();
eB.init('Bill', 5000);
var mB = new ManagerB();
mB.init('Jack', 10000, 0.3);

console.log(eB.toString());
console.log(mB.toString());

console.log(eB instanceof EmployeeB);
console.log(eB instanceof ManagerB);
console.log(mB instanceof EmployeeB);
console.log(mB instanceof ManagerB);


/**
 *  EmployeeC -> ManagerC
 *  以上的继承实现都基于 ManagerC.prototype = new EmployeeC(); 满足instanceof
 *  当继承链很深，影响原型链查找速度
 *  由于我们在写一个类的时候，实例的属性往往写在构造函数内部，方法写在原型对象中， 考虑mixin模式
 *  原型链浅，多重继承
 *  instanceof 不支持
 */
var mixin = function(target /*any numbers of sources*/){
    if(arguments.length > 1){
        var sources = Array.prototype.slice.call(arguments, 1);
        sources.forEach(function(value){
            for(var prop in value){
                if(!target.hasOwnProperty(prop)){
                    target[prop] = value[prop];
                }
            }
        });
    }
    return target;
};

function EmployeeC(){
    this.init.apply(this, arguments);
}

EmployeeC.prototype = {
    constructor: EmployeeC,

    init: function(name, salary){
        this.name = name;
        this.salary = salary;
    },

    getName: function(){
        return this.name;
    },

    getSalary: function(){
        return this.salary;
    },

    toString: function(){
        return this.getName() + '\'s salary is ' + this.getSalary() + '.';
    }
};

function ManagerC(){
    this.init.apply(this, arguments);
}

ManagerC.prototype.init = function(name, salary, percentage){
    EmployeeC.prototype.init.apply(this, [name, salary]);
    this.percentage = percentage;
};

ManagerC.prototype.getPercentage = function(){
    return this.percentage;
};

ManagerC.prototype.toString = function(){
    return this.getName() + '\'s salary is ' + this.getSalary() * (1 + this.getPercentage()) + '.';
};

mixin(ManagerC.prototype, EmployeeC.prototype);

var eC = new EmployeeC('Bill', 5000);

var mC = new ManagerC('Jack', 10000, 0.3);

console.log(eC.toString());
console.log(mC.toString());

console.log(eC instanceof EmployeeC);
console.log(eC instanceof ManagerC);
console.log(mC instanceof EmployeeC);
console.log(mC instanceof ManagerC);

/**
 *  EmployeeD -> ManagerD
 *  以上继承都需要在子类的构造函数或者方法中调用父类的构造函数或者方法
 *  考虑动态设置函数
 */
var mixinD = function(target /*any numbers of sources*/){
    if(arguments.length > 1){
        var sources = Array.prototype.slice.call(arguments, 1);
        sources.forEach(function(value){
            for(var prop in value){
                if(!target.hasOwnProperty(prop)){
                    target[prop] = value[prop];
                }
            }
        })
    }
    return target;
};

function EmployeeD(){
    this.init.apply(this, arguments);
}

EmployeeD.prototype = {
    init: function(name, salary){
        this.name = name;
        this.salary = salary;
    },

    getName: function(){
        return this.name;
    },

    getSalary: function(){
        return this.salary;
    },

    toString: function(){
        return this.getName() + '\'salary is ' + this.getSalary() + '.';
    }
};

function ManagerD(){
    this.baseProto = EmployeeD.prototype;
    this.init.apply(this, arguments);
}

mixinD(ManagerD.prototype, EmployeeD.prototype);

ManagerD.prototype.init = (function(name, func){
    return function(){
        var old = this.base;
        this.base = this.baseProto[name];
        var ret = func.apply(this, arguments);
        this.base = old;
        return ret;
    }
})('init', function(name, salary, percentage){
    this.base(name, salary);
    this.percentage = percentage;
});

ManagerD.prototype.getPercentage = function(){
    return this.percentage;
};

ManagerD.prototype.toString = function(){
    return this.getName() + '\'s salary is ' + this.getSalary() * (1 + this.getPercentage()) + '.';
};

var eD = new EmployeeD('Bill', 5000);
var mD = new ManagerD('Jack', 10000, 0.3);

console.log(eD.toString());
console.log(mD.toString());

console.log(eD instanceof EmployeeD);
console.log(eD instanceof ManagerD);
console.log(mD instanceof EmployeeD);
console.log(mD instanceof ManagerD);

/**
 *  EmployeeE -> ManagerE
 *
 *  var EmployeeE = Class({
 *      instanceMembers: {
 *
 *      },
 *      staticMembers: {
 *
 *      }
 *  });
 *
 *  var ManagerE = Class({
 *      instanceMembers: {
 *
 *      },
 *      staticMembers: {
 *
 *      },
 *      extend: EmployeeE
 *  });
 *
 */

var Class = (function(){

    var isArray = function(o){
        return Object.prototype.toString.call(o).slice(8, -1) === "Array";
    };

    var isObject = function(o){
        if(typeof o === 'object' && !isArray(o) && o !== null){
            return true;
        }
        return false;
    };

    var isFunction = function(o){
        return typeof o === 'function';
    };

    var mixin = function(target){
        if(arguments.length > 1){
            var sources = Array.prototype.slice.call(arguments, 1);
            sources.forEach(function(value){
                if(isObject(value)){
                    for(var prop in value){
                        if(!target.hasOwnProperty(prop)){
                            target[prop] = value[prop];
                        }
                    }
                }
            });
        }
        return target;
    };

    var classBuilder = function(options){

        if(!isObject(options)){
            throw new TypeError("Class options must be an valid object instance!");
        }

        var instanceMembers = isObject(options.instanceMembers) && options.instanceMemebers || {};
        var staticMembers = isObject(options.staticMembers) && options.staticMembers || {};
        var extend = isFunction(options.extend) && options.extend;
;
        var TargetClass = function(){
            if(isFunction(this.init)){
                this.init.apply(this, arguments);
            }
        };

        for(var prop in staticMembers){
            if(staticMembers.hasOwnProperty(prop)){
                TargetClass[prop] = staticMembers[prop];
            }
        }

        mixin(TargetClass.prototype, extend.prototype);
        //TargetClass.prototype = instanceMembers;
        for(var prop in instanceMembers){
            TargetClass.prototype[prop] = instanceMembers[prop];
        }

        TargetClass.prototype.constructor = TargetClass;

        return TargetClass;
    };

    return classBuilder;
})();

