# Source catalog

Research checked 2026-10-30. Original documents are linked below; downloads are not distributed in this repository. Source availability and simulator data can change. Do not turn old SDK inventories into guarantees about current live data.

## Primary documents (original URLs; PDFs not redistributed)

| Local file | Original source | Use |
| --- | --- | --- |
| Shock tuning guide | [iRacing shock tuning guide](https://s100.iracing.com/wp-content/uploads/2021/08/Shock-Tuning-User-Guide.pdf) | Shock terminology and interpretation; not a universal click prescription |
| Telemetry quickstart | [iRacing telemetry quickstart](https://ir-core-sites.iracing.com/dev/atlas/atlas_quickstart.pdf) | Recording and distance-based telemetry comparison |

## Integration and workflow sources

- [SimHub plugin SDK](https://github.com/SHWotever/SimHub/wiki/Plugin-and-extensions-SDKs).
- [SimHub author's MQTT publishing example](https://github.com/SHWotever/SimHub-MQTT-Publisher/blob/main/SimHubMQTTPublisherPlugin.cs).
- [SimHub author's iRacing slip-data explanation](https://github.com/SHWotever/SimHub/issues/2307).
- [Official iRacing garage/setup export explanation](https://www.iracing.com/commodores-garage-26-pre-build-prep-post-season-tests/).
- [iRacing SDK header in a community mirror](https://github.com/vipoo/irsdk/blob/master/irsdk_defines.h), not an official maintained SDK repository.
- [Historical iRacing channel table](https://us.v-cdn.net/6034148/uploads/8DD84H30FIC8/telemetry-11-23-15.pdf), explicitly historical.
- [Official LMU telemetry recording documentation](https://guide.lemansultimate.com/hc/en-gb/articles/14524956311695-Telemetry-Recording), retained as a possible later-adapter reference.
- [TinyPedal LMU shared-memory wrapper](https://github.com/TinyPedal/pyLMUSharedMemory), a maintainer implementation rather than a per-car data guarantee.
- [Official OpenAI skill documentation](https://learn.chatgpt.com/docs/build-skills), for skill packaging/discovery. The local skill is currently a draft outside automatic discovery.

Detailed conclusions and additional citations are in [iRacing feasibility](../iracing-feasibility.md), [SimHub integration](../simhub-integration.md), and the two local video analyses.
