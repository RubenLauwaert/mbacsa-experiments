import { WebID } from "mbacsa-client/dist/types/WebID";


export function extractPathToPodServer(agent: WebID):string{
  const url = new URL(agent);
  const pathToPodServer = url.origin + "/";
  return pathToPodServer;
}



export function generatePerformanceResult(responseTimes: number[]): PerformanceResult {
  if (responseTimes.length === 0) {
    throw new Error("responseTimes array is empty");
  }

  // Convert microseconds to milliseconds
  const responseTimesInMilliseconds = responseTimes.map(time => time / 1000);

  // Sort the response times in ascending order
  const sortedTimes = responseTimesInMilliseconds.slice().sort((a, b) => a - b);

  // Calculate max, min, standard deviation, average, and median
  const maxTime = Math.max(...sortedTimes);
  const minTime = Math.min(...sortedTimes);
  const sum = sortedTimes.reduce((acc, time) => acc + time, 0);
  const averageTime = sum / sortedTimes.length;
  const stdDev = Math.sqrt(sortedTimes.reduce((acc, time) => acc + Math.pow(time - averageTime, 2), 0) / sortedTimes.length);
  
  // Calculate the median
  const middle = Math.floor(sortedTimes.length / 2);
  const medianTime = sortedTimes.length % 2 === 0
    ? (sortedTimes[middle - 1] + sortedTimes[middle]) / 2
    : sortedTimes[middle];

  // Format the results to have two digits after the decimal point
  const formatResult = (value: number): number => parseFloat(value.toFixed(2));

  return {
    max_time: formatResult(maxTime),
    min_time: formatResult(minTime),
    std_dev: formatResult(stdDev),
    avg_time: formatResult(averageTime),
    median_time: formatResult(medianTime)
  };
}


export type AgentInfo = {
  webId:WebID,
  email:string,
  password:string
}

export const emptyPerformanceResult:PerformanceResult = {
  max_time: 0,
  min_time:0,
  avg_time:0,
  std_dev:0,
  median_time:0
}

export type PerformanceResult = {
  max_time:number,
  min_time:number,
  std_dev:number,
  avg_time:number,
  median_time?:number
}