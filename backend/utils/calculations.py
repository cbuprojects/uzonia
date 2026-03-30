from typing import List
from .database import get_last_five_uzonia


def calculate_10_percent(n: int, ten_percent_value: float, repos_data_list: list) -> List:
    while repos_data_list and ten_percent_value > 0:
        current_value = repos_data_list[n][2]
        diff_value = ten_percent_value - current_value

        if diff_value > 0:
            removed_item = repos_data_list.pop(n)
            print(f'removed item: {removed_item}')
            ten_percent_value = diff_value
            print(f'New ten_percent_value: {ten_percent_value}')
            print(f'updated list: {repos_data_list}')
        else:
            repos_data_list[n][2] = abs(diff_value)
            break

    return repos_data_list


def calculate_total_sum(repos_data_list: list) -> float:
    value = 0
    for row in repos_data_list:
        value += row[2]

    return value


def calculate_total_multiplication_sum(repos_data_list: list) -> float:
    total_value = 0
    for row in repos_data_list:
        index = row[1]
        value = row[2]
        total_value += (value * index)

    return total_value


def calculate_uzonia_value(total_sum: float, total_multiplication_sum: float) -> float:

    uzonia_value = total_multiplication_sum / total_sum
    uzonia_value = round(uzonia_value, 4)
    uzonia_value = float(f'{uzonia_value:.4f}')
    return uzonia_value


def calculate_day_uzonia(ten_percent_value: float, repos_data_list: list) -> float:
    repos_data_list = calculate_10_percent(n=0, ten_percent_value=ten_percent_value, repos_data_list=repos_data_list)
    print('10% Repo list: ', repos_data_list)

    repos_data_list = calculate_10_percent(n=-1, ten_percent_value=ten_percent_value,  repos_data_list=repos_data_list)
    print('10% Repo down list: ', repos_data_list)
    total_sum = calculate_total_sum(repos_data_list)
    total_multiplication_sum = calculate_total_multiplication_sum(repos_data_list)
    day_uzonia = calculate_uzonia_value(total_sum, total_multiplication_sum)
    return day_uzonia


def calculate_cb_rate(cb_rate: float, last_five_uzonia: list) -> float:
    uzonia_cb_rate_sum_list = []
    for uzonia_value in last_five_uzonia:
        uzonia_cb_rate  = uzonia_value - cb_rate
        uzonia_cb_rate_sum_list.append(uzonia_cb_rate)
    uzonia_cb_rate_sum = sum(uzonia_cb_rate_sum_list)

    final_cb_rate = cb_rate + (uzonia_cb_rate_sum / 5)
    return final_cb_rate
