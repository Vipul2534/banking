<<<<<<< HEAD
'use client';

import CountUp from 'react-countup';

const AnimatedCounter = ({ amount }: { amount: number }) => {
  return (
    <div className="w-full">
      <CountUp 
        decimals={2}
        decimal=","
        prefix="$"
        end={amount} 
      />
    </div>
  )
}

=======
import React from 'react'
import CountUp from 'react-countup'

const AnimatedCounter = ({amount}:{amount:number}) => {
  return (
    <div className="w-full">
      <CountUp 
        decimals={2}
        decimal=","
        prefix="$"
        end={amount} 
      />
    </div>
  )
}

>>>>>>> 29e0156e133ca95de121493029b24a100914d2b5
export default AnimatedCounter