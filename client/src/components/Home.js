import React from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuid } from "uuid";
import { useNavigate } from "react-router-dom";


function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("Room id created");
  };

  const joinRoom=()=>{
    if(!roomId||!username){
      toast.error("room id and username are requierd");
    }
    navigate(`/editor/${roomId}`,{
      state:{
        username

      }
    });
    toast.success("room is created");
  };

    return (
        <div className="container-fluid">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-12 col-md-6">
            <div className="card shadow-sm p-2 mb-5 custom-card rounded">
              <div className="card-body text-center custom-card-body">

              <div className="form-group">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="form-control mb-2"
                  placeholder="ROOM ID"
                  // onKeyUp={handleInputEnter}
                    />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                   className="form-control mb-2"
                   placeholder="USERNAME"
                  // onKeyUp={handleInputEnter}
                />
              </div>
              <button
                onClick={joinRoom}
                className="btn btn-success btn-lg btn-block"
              >
                JOIN
              </button>
              <p className="mt-3 text-light">
                Don't have a room ID? create{" "}
                <span
                    onClick={generateRoomId}
                  className=" text-success p-2"
                  style={{ cursor: "pointer" }}
                >
                   {" "}
                  New Room
                </span>
              </p>
                </div>
                </div>
                </div>
                </div>

        </div>
       
    );
};

export default Home;