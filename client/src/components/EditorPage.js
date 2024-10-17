import React, { useState,useRef,useEffect } from 'react';
import Client from './Client'
import Editor from './Editor';
import { initSocket } from '../socket';
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";


const EditorPage = () => {
  const[clients,setClients]=useState([]); 
  const socketRef = useRef(null);
  const location =useLocation();
  const {roomId}=useParams();
  const navigate=useNavigate();
  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));
      const handleErrors = (err) => {
        console.log("Error", err);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };

      socketRef.current.emit('JOIN',{
        roomId,
        username:location.state?.username,

      })
      socketRef.current.on(
        "JOINED",
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
        });
       
        socketRef.current.on("DISCONNECTED", ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) => {
            return prev.filter((client) => client.socketId !== socketId);
          });
        });
           

    };
    init();

    return () => {
      socketRef.current.off("JOINED");
      socketRef.current.off("DISCONNECTED");
    };
  },[]);
    
    
    if (!location.state) {
      return <Navigate to="/" />;
    }

    const copyRoomId = async () => {
      try {
        await navigator.clipboard.writeText(roomId);
        toast.success(`Room ID is copied`);
      } catch (error) {
        console.log(error);
        toast.error("Unable to copy the room ID");
      }
    };
  
    const leaveRoom = async () => {
      navigate("/");

    };
        
    return (
        <div className="container-fluid vh-100">
      <div className="row h-100">
        {/* client panel */}
        <div
          className="col-md-2 bg-dark text-light d-flex flex-column h-100"
          style={{ boxShadow: "2px 0px 4px rgba(0, 0, 0, 0.1)" }}
        >
          <img
            src="/images/codecast.png"
            alt="Logo"
            className="img-fluid mx-auto"
            style={{ maxWidth: "150px", marginTop: "-43px" }}
          />
          <hr style={{ marginTop: "3rem" }} />

          {/* Client list container */}
          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Members</span>
            {clients.map((client) => (
                            <Client key={client.socketId}  username={client.username} />
                        ))}
          </div>

          <hr />
          {/* Buttons */}
          <div className="mt-auto ">
            <button className="btn btn-success" 
            onClick={copyRoomId}
            >
              Copy Room ID
            </button>
            <button
              className="btn btn-danger mt-2 mb-2 px-3 btn-block"
              onClick={leaveRoom}
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Editor panel */}
        <div className="col-md-10 text-light d-flex flex-column h-100 ">
          <Editor socketRef={socketRef} roomId={roomId}/>
        </div>
      </div>
    </div>
    );
};

export default EditorPage;