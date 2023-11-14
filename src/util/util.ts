import { WebID } from "mbacsa-client-2/dist/types/WebID";
import { mainModule } from "process";
import { PerformanceResult } from "../experiments/main";

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

  // Calculate max, min, standard deviation, and average
  const maxTime = Math.max(...responseTimesInMilliseconds);
  const minTime = Math.min(...responseTimesInMilliseconds);
  const sum = responseTimesInMilliseconds.reduce((acc, time) => acc + time, 0);
  const averageTime = sum / responseTimesInMilliseconds.length;
  const stdDev = Math.sqrt(responseTimesInMilliseconds.reduce((acc, time) => acc + Math.pow(time - averageTime, 2), 0) / responseTimesInMilliseconds.length);

  // Format the results to have two digits after the decimal point
  const formatResult = (value: number): number => parseFloat(value.toFixed(2));

  return {
    max_time: formatResult(maxTime),
    min_time: formatResult(minTime),
    std_dev: formatResult(stdDev),
    avg_time: formatResult(averageTime)
  };
}


export type AgentInfo = {
  webId:WebID,
  email:string,
  password:string
}

export async function measurePerformanceAsync(fn: () => Promise<any>): Promise<number> {
  const start = process.hrtime();
  await fn();
  const end = process.hrtime(start);
  return end[0] * 1e6 + end[1] / 1e3; // Convert to microseconds
}