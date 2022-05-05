#!/usr/bin/env bash
PDISK=$(diskutil list physical external | head -n1 | cut -d' ' -f1)
APFSCONT=$(diskutil list physical external | grep Apple_APFS | tr -s ' ' | cut -d' ' -f8)
yes | sudo diskutil repairDisk $PDISK
sudo diskutil apfs resizeContainer $APFSCONT 0
