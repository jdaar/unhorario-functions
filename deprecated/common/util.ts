export type Optional<T> = {
  [P in keyof T]?: T[P];
};

export function generateRangedDictionary(ranges: {[key: string]: int[]}): {[key: string]: int}[] {
  const queue = Object.entries(ranges).map(([key, range]) => {
    return new Array(range[1] - range[0]).fill(0).map((_, idx) => {
      return {
        [key]: idx + range[0]
      }
    })
  })

  let result: Array<{[key: string]: int}> = queue.shift();
  while(queue.length > 0) {
    const head = queue.shift()
    result = result.flatMap((element) => head.map(headElement => ({
      ...element,
      ...headElement
    })))
  }

  return result;
}