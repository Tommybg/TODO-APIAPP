import React, { useState, useEffect } from 'react';
import { TrashIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';
import { format } from 'date-fns';

const TodoApp = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    task: '',
    priority: 'low',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    duration: 1,
    completed: false  // Add this field
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiUrl = 'http://localhost:8000/tasks/';

  useEffect(() => {
    fetchTasks();
  }, []);

  // Get new task
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Remove credentials since we set allow_credentials=False
        mode: 'cors'  // Explicitly set CORS mode
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Post new task
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskToSend = {
        ...newTask,
        duration: parseInt(newTask.duration), // Ensure duration is an integer
        due_date: format(new Date(newTask.due_date), 'yyyy-MM-dd') // Ensure proper date format
      };
  
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskToSend)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add task');
      }
      
      await fetchTasks();
      setNewTask({
        task: '',
        priority: 'low',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        duration: 1,
        completed: false
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete tasks 
  const handleDelete = async (taskId) => {
    try {
      const response = await fetch(`${apiUrl}${taskId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete task');
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleCompletion = async (taskId, completed) => {
    try {
      const response = await fetch(`${apiUrl}${taskId}/`, {
        method: 'PATCH',  // Changed from PUT to PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update task');
      }
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Task Manager</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md flex items-center">
            <AlertCircleIcon className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={newTask.task}
              onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
              placeholder="Enter task description"
              className="w-full p-3 border rounded-md"
              required
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="w-full p-3 border rounded-md"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              className="w-full p-3 border rounded-md"
            />
            <input
              type="number"
              value={newTask.duration}
              onChange={(e) => setNewTask({ ...newTask, duration: parseInt(e.target.value) })}
              placeholder="Duration (days)"
              min="1"
              className="w-full p-3 border rounded-md"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Task
          </button>
        </form>

        {loading ? (
          <div className="text-center py-4">Loading tasks...</div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.task_id}
                className={`p-4 rounded-lg border ${
                  task.completed ? 'bg-gray-50' : 'bg-white'
                } flex items-center justify-between`}
              >
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleCompletion(task.task_id, task.completed)}
                    className="focus:outline-none"
                  >
                    {task.completed ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                  <div>
                    <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                      {task.task}
                    </p>
                    <div className="flex space-x-4 text-sm text-gray-500">
                      <span className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      <span>Due: {task.due_date}</span>
                      <span>{task.duration} day(s)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(task.task_id)}
                  className="text-red-500 hover:text-red-700 focus:outline-none"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoApp;