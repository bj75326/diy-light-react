/**
 *  虚拟dom对象
 *  虚拟dom差异化算法
 *  单向数据流
 *  组件生命周期
 *  事件处理
 */

(function(){

    /**************Unity**************/
    var Bin = {
        on: function(element, type, handler, userCapture){
            if(document.attachEvent){
                element.attachEvent("on" + type, handler);
            }else if(document.addEventListener){
                element.addEventListener(type, handler, userCapture);
            }
        },

        off: function(element, type, handler, userCapture){
            if(document.detachEvent){
                element.detachEvent("on" + type, handler);
            }else if(document.removeEventListener){
                element.removeEventListener(type, handler, userCapture);
            }
        },

        eventDispatch: function(element, type, customProperty){
            if(document.fireEvent){
                var event = document.createEventObject();
                event.type = type;
                event.dispatchFlag = true;
                element.fireEvent("on" + type);
            }else if(document.dispatchEvent){
                var event = new Event(type, {
                    "view": window,
                    "bubble": true,
                    "cancelable": true
                });
                event.dispatchFlag = true;
                if(customProperty){
                    for(var key in customProperty){
                        if(!(key in event)){
                            event[key] = customProperty[key];
                        }
                    }
                }
                element.dispatchEvent(event);
            }
        },

        delegate: function(element, selector, type, handler, userCapture){
            if(document.attachEvent){
                element.attachEvent("on"+type, function(e){
                    var event = e || window.event;
                    if(event.target === document.querySelector(selector)){
                        handler.apply(document.querySelector(selector));
                    }
                });
            }else if(document.addEventListener){
                element.addEventListener(type, function(e){
                    var event = e || window.event;
                    if(event.target === document.querySelector(selector)){
                        handler.apply(document.querySelector(selector));
                    }
                }, userCapture);
            }
        },

        isArray: function(obj){
            return Object.prototype.toString.call(obj).slice(8, -1) === "Array";
        },

        extend: function(tar /*any numbers of objects*/){
            if(arguments.length > 1){
                var parents = Array.prototype.slice.call(arguments, 1);
                parents.forEach(function(parent){
                    for(var prop in parent){
                        if(parent.hasOwnProperty && parent.hasOwnProperty(prop)){
                            tar[prop] = parent[prop];
                        }
                    }
                });
            }
        }
    };
    /****************************/
    //React Class 超级父类
    function ReactClass(){

    }
    //interface 留着被子类覆盖
    ReactClass.prototype.render = function(){};

    function ReactElement(type, key, props){
        this.type = type;
        this.key = key;
        this.props = props;
    }

    function ReactDOMTextComponent(text){
        this._currentElement = '' + text;
        this._rootNodeID = null;
    }

    ReactDOMTextComponent.prototype.mountComponent = function(rootID){
        this._rootNodeID = rootID;
        return '<span data-reactid="' + rootID + '">' + this._currentElement + '</span>';
    };

    function ReactDOMComponent(element){
        this._currentElement = element;
        this._rootNodeID = null;
    }

    ReactDOMComponent.prototype.mountComponent = function(rootID){
        this._rootNodeID = rootID;
        var props = this._currentElement.props;
        var tagOpen = '<' + this._currentElement.type ;
        var tagClose = '</' + this._currentElement.type + '>';

        tagOpen += ' data-reactid=' + this._rootNodeID;

        //添加属性
        for(var propKey in props){
            //事件属性处理
            if(/^on[A-Za-z]/.test(propKey)){
                var eventType = propKey.replace(/^on/, '');
                Bin.delegate(document, '[data-reactid="' + this._rootNodeID + '"]', eventType, props[propKey]);
            }

            //属性拼接，除去children和事件属性
            if(props[propKey] && propKey !== 'children' && !/^on[A-Za-z]/.test(propKey)){
                tagOpen += ' ' + propKey + props[propKey];
            }
        }

        var content = '';
        var children = props.children || [];

        var childrenInstances = [];
        var that = this;

        children.forEach(function(child, key){
            var childComponentInstance = instantiateReactComponent(child);
            childComponentInstance._mountIndex = key;
            childrenInstances.push(childComponentInstance);
            var curRootId = that._rootNodeID + '.' + key;

            var childMarkup = childComponentInstance.mountComponent(curRootId);

            content += ' ' + childMarkup;
        });

        this._renderedChildren = childrenInstances;
        return tagOpen + '>' + content + tagClose;
    };

    function ReactCompositeComponent(element){
        this._currentElement = element;
        this._rootNodeID = null;
        this._instance = null;
    }

    ReactCompositeComponent.prototype.mountComponent = function(rootID){
        this._rootNodeID = rootID;

        var publicProps = this._currentElement.props;
        var ReactClass = this._currentElement.type;

        var inst = new ReactClass(publicProps);

        this._instance = inst;

        inst._reactInternalInstance = this;

        if(inst.componentWillMount){
            inst.componentWillMount();
        }

        var renderedElement = this._instance.render();

        var renderedComponentInstance =  instantiateReactComponent(renderedElement);
        this._renderedComponent = renderedComponentInstance;

        var renderedMarkup = renderedComponentInstance.mountComponent(this._rootNodeID);

        Bin.on(document, 'mountReady', function(){
            inst.componentDidMount && inst.componentDidMount();
        }, false);

        return renderedMarkup;
    };

    function instantiateReactComponent(node){
        //component 工厂类
        //文本节点的情况
        if(typeof node === "string" || typeof node === "number"){
            return new ReactDOMTextComponent(node);
        }
        //浏览器默认节点
        if(typeof node === "object" && typeof node.type === "string"){
            return new ReactDOMComponent(node);
        }
        //自定义组件节点
        if(typeof node === "object" && typeof node.type === "function"){
            return new ReactCompositeComponent(node);
        }
    }

    var React = {
        nextReactRootIndex: 0,

        createElement: function(type, config, children){
            var props = {}, propName;
            config = config || {};
            //key属性单独处理
            var key = config.key || null;
            //复制config到props
            for(propName in config){
                if(config.hasOwnProperty(propName) && propName !== 'key'){
                    props[propName] = config[propName];
                }
            }
            //处理children
            var childrenLength = arguments.length - 2;
            if(childrenLength === 1){
                props.children = Bin.isArray(children) ? children : [children];
            }else if(childrenLength > 1){
                props.children = Array.prototype.slice.call(arguments, 2);
            }

            return new ReactElement(type, key, props);
        },

        createClass: function(spec){
            var Constructor = function(props){
                this.props = props;
                this.state = this.getInitialState ? this.getInitialState() : null;
            };

            Constructor.prototype = new ReactClass();
            Constructor.prototype.constructor = Constructor;

            //mixin 继承
            Bin.extend(Constructor.prototype, spec);

            return Constructor;
        },

        render: function(element, container){
            var componentInstance = instantiateReactComponent(element);
            var markup = componentInstance.mountComponent(React.nextReactRootIndex++);

            container.innerHTML = markup;
            Bin.eventDispatch(document, "mountReady");
        }
    };

    window.React = React;
})();



