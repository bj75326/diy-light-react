/**
 *  虚拟dom对象(Virtual DOM)
 *  虚拟dom差异化算法（diff algorithm）
 *  单向数据流渲染（Data Flow）
 *  组件生命周期
 *  事件处理
 *
 *  stage-1
 *  React.render('Hello World', document.getElementById("container"));
 *
 *  -before
 *  <div id="container"></div>
 *
 *  -after
 *  <div id="container">
 *      <span data-reactid='0'>hello world</span>
 *  </div>
 *
 *
 *  stage-2
 *  const hello = ()=>{
 *      alert("Hello");
 *  }
 *
 *  let element = React.createElement('div', {id: 'test', onClick: hello}, 'click me');
 *
 *  React.render(element, document.getElementById("container"));
 *
 *  -before
 *  <div id="container"></div>
 *
 *  -after
 *  <div id="container">
 *      <div data-reactid='0' id='test'>
 *          <span data-reactid='0.0'>click me</span>
 *      </div>
 *  </div>
 *
 *  *click 'click me' will trigger function hello
 *
 *
 *  stage-3
 *  const HelloMessage = React.createClass({
 *      getInitialState(){
 *          return {type: 'say:'};
 *      },
 *
 *      componentWillMount(){
 *          console.log('I will do mount');
 *      },
 *
 *      componentDidMount(){
 *          console.log('I did mount');
 *      },
 *
 *      render(){
 *          return React.createElement("div", null, this.state.type, "Hello", this.props.name);
 *      }
 *  });
 *
 *  React.render(React.createElement(HelloMessage, {name: "John"}), document.getElementById("container"));
 *
 *  -before
 *  <div id="container"></div>
 *
 *  -after
 *  <div id="container">
 *      <div data-reactid="0">
 *          <span>say:</span>
 *          <span>Hello</span>
 *          <span>John</span>
 *      <div>
 *  </div>
 *
 *
 *  stage-4
 *
 */

(()=>{

    const Bin = {
        on(element, type, handler, userCapture){
            if(document.attachEvent){
                element.attachEvent("on" + type, handler);
            }else if(document.addEventListener){
                element.addEventListener(type, handler, userCapture);
            }
        },

        off(element, type, handler, userCapture){
            if(document.detachEvent){
                element.detachEvent("on" + type, handler);
            }else if(document.removeEventListener){
                element.removeEventListener(type, handler, userCapture);
            }
        },

        eventDispatch(element, type, customProperty){
            if(document.fireEvent){
                var event = document.createEventObject();
                event.eventType = type;
                event.dispatchFlag = true;
                element.fireEvent("on" + type, event);
            }else if(document.dispatchEvent){
                var event = new Event(type, {
                    "view": window,
                    "bubbles": true,
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

        delegate(element, selector, type, handler, userCapture){
            if(document.attachEvent){
                element.attachEvent('on' + type, function(e){
                    let event = e || window.event;
                    if(Bin.inArray(event.target, document.querySelectorAll(selector))){
                        handler.apply(event.target);
                    }
                });
            }else if(document.addEventListener){
                element.addEventListener(type, function(e){
                    let event = e || window.event;
                    if(Bin.inArray(event.target, document.querySelectorAll(selector))){
                        handler.apply(event.target);
                    }
                }, userCapture);
            }
        },

        inArray(needle, haystack){
            let i=0, n=haystack.length;
            for(;i<n;i++){
                if(haystack[i] === needle){
                    return true;
                }
            }
            return false;
        },

        firstLowerCase(str){
            return str[0].toLowerCase() + str.slice(1);
        },

        firstUpperCase(str){
            return str[0].toUpperCase() + str.slice(1);
        },

        mixin(target /*any numbers */){
            if(arguments.length > 1){
                let sources = Array.prototype.slice.call(arguments, 1).reverse();
                sources.forEach(function(source){
                    for(let key in source){
                        if(!target.hasOwnProperty(key)){
                            target[key] = source[key];
                        }
                    }
                });
            }
            return target;
        }
    };

    class ReactClass{
        constructor(){

        }

        render(){

        }
    }

    class ReactElement{
        constructor(type, key, props){
            this.type = type;
            this.key = key;
            this.props = props;
        }
    }

    class ReactDOMTextComponent{
        constructor(text){
            this._currentElement = text;
            this._rootNodeID = null;
        }

        mountComponent(rootNodeID){
            this._rootNodeID = rootNodeID;
            return '<span data-reactid="' + rootNodeID + '">' + this._currentElement + '</span>';
        }
    }

    class ReactDOMComponent{
        constructor(element){
            this._currentElement = element;  //{type: 'div', key: xxx, props: {children: [...], onClick: function(){}}}
            this._rootNodeID = null;
        }

        mountComponent(rootNodeID){
            this._rootNodeID = rootNodeID;
            let props = this._currentElement.props;
            let tagOpen = '<' + this._currentElement.type;
            let tagClose = '</' + this._currentElement.type + '>';

            //reactid
            tagOpen += ' data-reactid=' + this._rootNodeID;

            for(let propKey in props){
                //propKey start with 'on'
                if(/^on[a-zA-Z]/.test(propKey)){
                    let eventType = Bin.firstLowerCase(propKey.replace(/^on/, ''));
                    Bin.delegate(document, '[data-reactid="' + this._rootNodeID + '"]', eventType, props[propKey], false);
                }
                //propKey normal
                if(props[propKey] && propKey !== 'children' && !/^on[a-zA-Z]/.test(propKey)){
                    tagOpen += ' ' + propKey + '=' + props[propKey];
                }
            }

            //propKey - children
            let content = '';
            let children = props.children || [];

            let childrenInstances = [];
            let that = this;
            children.forEach(function(child, key){
                let childComponentInstance = instantiateReactComponent(child);
                childComponentInstance._mountIndex = key;
                childrenInstances.push(childComponentInstance);
                let curRootId = that._rootNodeID + '.' + key;

                let childMarkup = childComponentInstance.mountComponent(curRootId);

                content += ' ' + childMarkup;
            });
            this._renderedChildren = childrenInstances;
            return tagOpen + '>' + content + tagClose;
        }
    }

    class ReactDOMCompositeComponent{
        constructor(element){
            this._currentElement = element; //{type: Constructor, key: xxx, props: {children: [...], prop: ...}}
            this._rootNodeID = null;
            this._instance = null;
        }

        mountComponent(rootNodeID){
            this._rootNodeID = rootNodeID;

            let publicProps = this._currentElement.props;
            let ReactClass = this._currentElement.type;

            let inst = new ReactClass(publicProps);

            this._instance = inst;
            inst._reactInternalInstance = this;

            if(inst.componentWillMount){
                inst.componentWillMount();
            }

            let renderedElement = this._instance.render();

            let renderedComponentInstance = instantiateReactComponent(renderedElement);
            this._renderedComponent = renderedComponentInstance;

            let renderedMarkup = renderedComponentInstance.mountComponent(this._rootNodeID);

            Bin.on(document, 'mountReady', function(){
                inst.componentDidMount && inst.componentDidMount();
            }, false);

            return renderedMarkup;
        }
    }

    const instantiateReactComponent = node =>{
        if(typeof node === 'string' || typeof node === 'number'){
            return new ReactDOMTextComponent(node);
        }else if(typeof node === 'object' && typeof node.type === 'string'){
            return new ReactDOMComponent(node);
        }else if(typeof node === 'object' && typeof node.type === 'function'){
            return new ReactDOMCompositeComponent(node);
        }
    };

    const React = {
        nextReactRootIndex: 0,

        createElement(type, config, ...children){
            let props = {}, propName;
            config = config || {};
            let key = config.key || null;

            for(propName in config){
                if(config.hasOwnProperty(propName) && propName !== 'key'){
                    props[propName] = config[propName];
                }
            }

            if(children.length >= 1){
                props.children = children;
            }

            return new ReactElement(type, key, props);
        },

        createClass(spec){
            const Constructor = function(props){
                this.props = props;
                this.state = this.getInitialState ? this.getInitialState() : null;
            };

            Constructor.prototype = new ReactClass();
            Constructor.prototype.constructor = Constructor;

            Bin.mixin(Constructor.prototype, spec);

            return Constructor;
        },

        render(element, container){
            let componentInstance = instantiateReactComponent(element);
            let markup = componentInstance.mountComponent(this.nextReactRootIndex++);

            container.innerHTML = markup;

            //trigger event 'mountReady'
            Bin.eventDispatch(document, 'mountReady');
        }
    };

    window.React = React;
})();
