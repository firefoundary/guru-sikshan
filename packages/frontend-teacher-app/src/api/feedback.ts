import axios from 'axios';

//for testing on phone , change api url
//ip addr show | grep inet
const API_URL = 'http://x.x.x.x:3000/api'; 
export interface Feedback {
  teacher_id: string;
  issue: string;
  cluster: string;
}

export interface Module {
  id: number;
  title: string;
  content: string;
  duration: string;
}

export const submitIssue = async (data: Feedback) => {
  console.log('Sending request to:' , API_URL , '/feedback')
  console.log("Request data: ",data);
  const response = await axios.post(`${API_URL}/feedback`, data);
  return response.data;
};

export const submitFeedback = async (moduleId: number, rating: number, comments: string) => {
  //TODO : Feedback loop , connect to endpoint
  return { success: true };
};
