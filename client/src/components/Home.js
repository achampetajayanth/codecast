import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuid } from "uuid";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    if (type === 'error') toast.error(message);
  };

  const goToEditor = (id, user) => {
    navigate(`/editor/${id}`, {
      state: { username: user }
    });
  };

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    showToast('success', "Room id created");  // Use showToast here
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      showToast('error', 'room id and username are required');
      return;
    }
    goToEditor(roomId, username);
    showToast('success', 'room is created');
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
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-control mb-2"
                  placeholder="USERNAME"
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
                  className="text-primary p-2"
                  style={{ cursor: "pointer" }}
                >
                  New Room
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
