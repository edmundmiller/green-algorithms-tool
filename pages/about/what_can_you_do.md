---
title: What can you do about it?
---

The main factor impacting your footprint is the location of your servers: the same algorithm will emit 74 times more CO2e if ran in Australia compared to Switzerland. Although it's not always the case, many cloud providers offer the option to select a data centre.

Memory power draw is a huge source of waste, because the energy consumption depends on the memory available, not the actual usage, only requesting the needed memory is a painless way to reduce greenhouse gas emissions.

Generally, taking the time to write optimised code that runs faster with fewer resources saves both money and the planet.

And above all, only run jobs that you need!

## The formula

The carbon footprint is calculated by estimating the energy draw of the algorithm and the carbon intensity of producing this energy at a given location:

<!-- TODO Render these nicely -->

## carbon footprint = energy needed * carbon intensity

Where the energy needed is:

## runtime * (power draw for cores * usage + power draw for memory) * PUE * PSF

The power draw for the computing cores depends on the model and number of cores, while the memory power draw only depends on the size of memory available. The usage factor corrects for the real core usage (default is 1, i.e. full usage). The PUE (Power Usage Effectiveness) measures how much extra energy is needed to operate the data centre (cooling, lighting etc.). The PSF (Pragmatic Scaling Factor) is used to take into account multiple identical runs (e.g. for testing or optimisation).

The Carbon Intensity depends on the location and the technologies used to produce electricity. But note that the "energy needed" indicated at the top of this page is independent of the location.

## How to report it?

It's important to track the impact of computational research on climate change in order to stimulate greener algorithms. For that, we believe that the carbon footprint of a project should be reported on publications alongside other performance metrics.

Here is a text you can include in your paper:

> This algorithm runs in 2h on 12 CPUs Xeon E7-8880 v4, and draws 352.17 Wh. Based in Austria, this has a carbon footprint of 39.15 g CO2e, which is equivalent to 4.27e-02 tree-months (calculated using green-algorithms.org v2.2 [1]).

[1] Lannelongue, L., Grealey, J., Inouye, M., Green Algorithms: Quantifying the Carbon Footprint of Computation. Adv. Sci. 2021, 2100707.

*Including the version of the tool is useful to keep track of the version of the data used.*

