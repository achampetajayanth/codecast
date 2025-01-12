// __mocks__/codemirror.js
const CodeMirror = jest.fn(() => ({
    getWrapperElement: jest.fn(() => ({
      getBoundingClientRect: jest.fn(() => ({
        width: 100,
        height: 100,
      })),
    })),
  }));
  
  CodeMirror.fromTextArea = jest.fn(() => CodeMirror());
  
  export default CodeMirror;
  

